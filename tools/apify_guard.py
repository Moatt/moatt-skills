"""
Apify run guard.

Bookkeeping wrapper around Apify actor invocations. Tracks how many runs the
current session has consumed against a configurable ceiling, and optionally
surfaces a cost-confirmation prompt before each batch so the caller can
abort before money is spent.

The guard transparently routes through the Moatt proxy when MOATT_API_KEY
is set — in that mode usage gets billed through the platform and the caller
doesn't need a direct Apify token. Without the platform key, it falls back
to talking to Apify's public API directly.
"""

import json
import os
import urllib.request

MOATT_API_BASE = os.environ.get("MOATT_API_BASE", "https://api.moatt.com")
MOATT_API_KEY = os.environ.get("MOATT_API_KEY")

if MOATT_API_KEY:
    _APIFY_BASE = f"{MOATT_API_BASE}/v1/proxy/apify"
else:
    _APIFY_BASE = "https://api.apify.com/v2"


def _proxy_auth_headers():
    """Bearer header when routing via Moatt proxy. Empty dict in direct mode."""
    return {"Authorization": f"Bearer {MOATT_API_KEY}"} if MOATT_API_KEY else {}

# ── Session state ───────────────────────────────────────────────────────────

_run_count = 0
_run_limit = 50
_auto_confirm = False


class ApifyLimitReached(Exception):
    """Signals that the per-session run cap has already been hit."""
    pass


# ── Knobs ───────────────────────────────────────────────────────────────────

def set_limit(limit):
    """Set the per-session ceiling on Apify actor invocations."""
    global _run_limit
    _run_limit = limit


def set_auto_confirm(auto):
    """Toggle whether cost prompts are shown — True suppresses them entirely."""
    global _auto_confirm
    _auto_confirm = auto


def get_run_count():
    """Return how many runs the guard has waved through so far this session."""
    return _run_count


def get_run_limit():
    """Return the currently configured per-session run ceiling."""
    return _run_limit


# ── Cost prompt ─────────────────────────────────────────────────────────────

def confirm_cost(phase_name, num_runs=1, est_cost=0.0):
    """
    Surface a confirmation prompt before a batch of runs.

    Prints the projected run count + cost for the named phase and waits for
    the user to type y/n. No-op when auto-confirm is enabled (a CLI `--yes`
    flag typically wires that on).
    """
    if _auto_confirm:
        return
    print(f"\n  {phase_name}")
    print(f"  Estimated runs: {num_runs}  |  Est. cost: ~${est_cost:.2f}")
    try:
        answer = input("  Proceed? [Y/n] ").strip().lower()
    except EOFError:
        answer = "y"
    if answer and answer not in ("y", "yes"):
        raise ApifyLimitReached(f"User declined {phase_name}")


# ── Guarded invocation ──────────────────────────────────────────────────────

def guarded_apify_run(actor_id, run_input, token, timeout=300):
    """
    Kick off an Apify actor run while honouring the session's run cap.

    Polls the run to a terminal status and returns the run ID on success.
    Raises ApifyLimitReached when the ceiling is already in the past, and
    RuntimeError if the run lands in any state other than SUCCEEDED.
    """
    global _run_count

    if _run_count >= _run_limit:
        raise ApifyLimitReached(
            f"Apify run limit reached ({_run_count}/{_run_limit}). "
            "Use --max-runs to increase."
        )

    url = f"{_APIFY_BASE}/acts/{actor_id}/runs?token={token}"
    data = json.dumps(run_input).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    for header_name, header_value in _proxy_auth_headers().items():
        req.add_header(header_name, header_value)

    resp = urllib.request.urlopen(req, timeout=timeout)
    result = json.loads(resp.read().decode("utf-8"))
    run_id = result["data"]["id"]
    status = result["data"]["status"]

    # Block on the run's status endpoint until it leaves the in-flight states.
    import time
    poll_url = f"{_APIFY_BASE}/actor-runs/{run_id}?token={token}"
    deadline = time.time() + timeout
    while status in ("READY", "RUNNING") and time.time() < deadline:
        time.sleep(5)
        poll_req = urllib.request.Request(poll_url, method="GET")
        for header_name, header_value in _proxy_auth_headers().items():
            poll_req.add_header(header_name, header_value)
        poll_resp = urllib.request.urlopen(poll_req, timeout=30)
        poll_data = json.loads(poll_resp.read().decode("utf-8"))
        status = poll_data["data"]["status"]

    if status != "SUCCEEDED":
        raise RuntimeError(f"Apify run {run_id} ended with status: {status}")

    _run_count += 1
    return run_id


# ── Dataset reader ──────────────────────────────────────────────────────────

def fetch_dataset(dataset_id, token, limit=1000):
    """
    Pull items from an Apify dataset by ID.

    Accepts either MOATT_API_KEY (when routing through the platform proxy)
    or a raw Apify token. Returns the deserialised list of items — no
    pagination handling, so callers that need more than `limit` items will
    have to slice their queries themselves.
    """
    url = f"{_APIFY_BASE}/datasets/{dataset_id}/items?token={token}&format=json&limit={limit}"
    req = urllib.request.Request(url, method="GET")
    for header_name, header_value in _proxy_auth_headers().items():
        req.add_header(header_name, header_value)
    resp = urllib.request.urlopen(req, timeout=60)
    return json.loads(resp.read().decode("utf-8"))
