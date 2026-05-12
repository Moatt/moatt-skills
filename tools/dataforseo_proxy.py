"""
DataForSEO REST proxy wrapper.

Routes every DataForSEO call through the Moatt platform proxy, where usage
is metered against the Moatt account. MOATT_API_KEY is required — direct
DataForSEO billing is no longer supported.

Standard usage from a skill script:

    from dataforseo_proxy import dfs_call

    result = dfs_call(
        "/v3/dataforseo_labs/google/keyword_overview/live",
        [{"keywords": ["aws cost"], "language_code": "en", "location_code": 2840}],
    )

DFS bodies are always arrays of task objects — even for single tasks. The
helper does NOT wrap a single dict for you; pass `[{...}]` explicitly so the
behaviour matches what the DFS docs document.
"""

import json
import os
import urllib.error
import urllib.request

MOATT_API_BASE = os.environ.get("MOATT_API_BASE", "https://api.moatt.com")
MOATT_API_KEY = os.environ.get("MOATT_API_KEY")

_PROXY_PATH = "/v1/proxy/dataforseo/rest"


def dfs_call(endpoint, body, timeout=60):
    """
    POST to a DataForSEO endpoint via the Moatt proxy and return the parsed
    JSON response.

    All traffic goes through Moatt — the platform meters usage and aggregates
    spend across vendors. Set MOATT_API_KEY (and optionally MOATT_API_BASE)
    before calling.

    Args:
        endpoint: DFS path starting with "/v3/". E.g.
            "/v3/dataforseo_labs/google/keyword_overview/live".
        body: List of task objects (per DFS convention — always a list).
        timeout: Request timeout in seconds.

    Returns:
        The deserialised JSON response. Shape mirrors DFS exactly; the proxy
        parses `cost` for billing but leaves the response otherwise untouched.

    Raises:
        ValueError: malformed endpoint or body.
        RuntimeError: MOATT_API_KEY is not configured.
        urllib.error.HTTPError: non-2xx response. Body is included in the
            error message so the caller can see what DFS complained about.
    """
    if not isinstance(endpoint, str) or not endpoint.startswith("/v3/"):
        raise ValueError(f"DFS endpoint must start with /v3/, got {endpoint!r}")
    if not isinstance(body, list):
        raise ValueError("DFS body must be a list of task objects")
    if not MOATT_API_KEY:
        raise RuntimeError(
            "MOATT_API_KEY is required — DataForSEO calls now route exclusively "
            "through the Moatt proxy. Set MOATT_API_KEY in your environment "
            "(see https://moatt.com for credentials)."
        )

    url = f"{MOATT_API_BASE}{_PROXY_PATH}"
    payload = json.dumps({"endpoint": endpoint, "body": body}).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {MOATT_API_KEY}",
        "Content-Type": "application/json",
    }

    req = urllib.request.Request(url, data=payload, method="POST")
    for name, value in headers.items():
        req.add_header(name, value)

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        # Surface the response body in the error so callers see the actual
        # DFS complaint (rate limit, invalid task, auth failure, etc.).
        body_text = ""
        try:
            body_text = exc.read().decode("utf-8")
        except Exception:
            pass
        raise urllib.error.HTTPError(
            exc.url,
            exc.code,
            f"{exc.reason}: {body_text[:500]}",
            exc.headers,
            None,
        )
