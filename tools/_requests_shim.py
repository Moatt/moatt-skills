"""
stdlib-only drop-in for the tiny subset of `requests` that moatt-skills use.

Why this exists: the Box runtime is Node, not Python — there's no `pip` and no
`requests` module pre-installed. Adding apt/pip to every Box would slow
provisioning and cost CPU. Skills only use 4 surfaces of `requests`:

    requests.get(url, headers=..., params=..., timeout=...)
    requests.post(url, headers=..., json=..., data=..., timeout=...)
    response.status_code / .text / .json() / .ok / .raise_for_status() / .headers
    requests.exceptions.RequestException  (raised on network failure)

This module emulates ALL of that with stdlib urllib + json. Skills opt in with:

    import sys, os, pathlib
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "tools"))
    import _requests_shim  # registers itself as `requests` in sys.modules
    import requests        # now resolves to the shim

Or — even simpler — the SKILL.md export step prepends the shim:

    export PYTHONPATH=/workspace/skills/_shared:$PYTHONPATH

…with a symlink `_shared/requests.py -> _requests_shim.py`. Either way, no
external package is needed.
"""
from __future__ import annotations

import json as _json
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


class _Exceptions:
    """Mirror of `requests.exceptions` — only the names skills actually catch."""

    class RequestException(Exception):
        """Base — matches `requests.exceptions.RequestException`."""

    class Timeout(RequestException):
        pass

    class HTTPError(RequestException):
        pass

    class ConnectionError(RequestException):  # noqa: N818 — matches requests name
        pass


exceptions = _Exceptions()


class Response:
    """Minimal mirror of `requests.models.Response`."""

    def __init__(self, status_code: int, body: bytes, headers: dict[str, str], url: str):
        self.status_code = status_code
        self._body = body
        self.headers = headers
        self.url = url
        self.encoding = "utf-8"

    @property
    def ok(self) -> bool:
        return 200 <= self.status_code < 400

    @property
    def text(self) -> str:
        try:
            return self._body.decode(self.encoding, errors="replace")
        except Exception:
            return self._body.decode("utf-8", errors="replace")

    @property
    def content(self) -> bytes:
        return self._body

    def json(self) -> Any:
        return _json.loads(self.text or "null")

    def raise_for_status(self) -> None:
        if not self.ok:
            raise exceptions.HTTPError(
                f"HTTP {self.status_code} for {self.url}: {self.text[:300]}"
            )

    def __repr__(self) -> str:
        return f"<Response [{self.status_code}]>"


def _request(
    method: str,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    params: dict[str, Any] | None = None,
    json_body: Any = None,
    data: Any = None,
    timeout: float | None = None,
) -> Response:
    full_url = url
    if params:
        sep = "&" if "?" in url else "?"
        full_url = f"{url}{sep}{urllib.parse.urlencode(params)}"

    body_bytes: bytes | None = None
    merged_headers = dict(headers or {})
    if json_body is not None:
        body_bytes = _json.dumps(json_body).encode("utf-8")
        merged_headers.setdefault("Content-Type", "application/json")
    elif data is not None:
        if isinstance(data, (bytes, bytearray)):
            body_bytes = bytes(data)
        elif isinstance(data, str):
            body_bytes = data.encode("utf-8")
        elif isinstance(data, dict):
            body_bytes = urllib.parse.urlencode(data).encode("utf-8")
            merged_headers.setdefault("Content-Type", "application/x-www-form-urlencoded")
        else:
            body_bytes = str(data).encode("utf-8")

    req = urllib.request.Request(full_url, data=body_bytes, headers=merged_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return Response(
                status_code=resp.status,
                body=resp.read(),
                headers=dict(resp.headers.items()),
                url=full_url,
            )
    except urllib.error.HTTPError as e:
        # requests treats 4xx/5xx as a valid Response, not an exception, so we
        # mirror that — only raise on .raise_for_status().
        return Response(
            status_code=e.code,
            body=e.read() if hasattr(e, "read") else (e.reason or "").encode("utf-8"),
            headers=dict(e.headers.items()) if e.headers else {},
            url=full_url,
        )
    except urllib.error.URLError as e:
        # DNS / refused / unreachable — requests would raise ConnectionError.
        raise exceptions.ConnectionError(f"{full_url}: {e.reason}") from e
    except TimeoutError as e:
        raise exceptions.Timeout(f"{full_url} timed out after {timeout}s") from e


def get(url: str, **kwargs: Any) -> Response:
    json_body = kwargs.pop("json", None)
    return _request("GET", url, json_body=json_body, **kwargs)


def post(url: str, **kwargs: Any) -> Response:
    json_body = kwargs.pop("json", None)
    return _request("POST", url, json_body=json_body, **kwargs)


def put(url: str, **kwargs: Any) -> Response:
    json_body = kwargs.pop("json", None)
    return _request("PUT", url, json_body=json_body, **kwargs)


def delete(url: str, **kwargs: Any) -> Response:
    json_body = kwargs.pop("json", None)
    return _request("DELETE", url, json_body=json_body, **kwargs)


def head(url: str, **kwargs: Any) -> Response:
    return _request("HEAD", url, **kwargs)


def patch(url: str, **kwargs: Any) -> Response:
    json_body = kwargs.pop("json", None)
    return _request("PATCH", url, json_body=json_body, **kwargs)


def request(method: str, url: str, **kwargs: Any) -> Response:
    json_body = kwargs.pop("json", None)
    return _request(method.upper(), url, json_body=json_body, **kwargs)


# Self-register as `requests` so `import requests` resolves to this module after
# this file has been imported (or after PYTHONPATH puts a `requests.py` symlink
# pointing here ahead of any real package).
sys.modules.setdefault("requests", sys.modules[__name__])
