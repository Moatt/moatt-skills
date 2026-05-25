#!/usr/bin/env python3
"""
SEO traffic analyzer — calls DataForSEO Labs endpoints through the Moatt proxy.

Pulls:
  - Current domain rank overview (organic traffic + keyword count)
  - Historical rank overview (multi-month trend)
  - Top traffic-driving pages (relevant_pages)
  - Top ranking keywords (ranked_keywords)
  - Competitor share-of-voice (competitors_domain)

Reads MOATT_API_KEY + MOATT_API_BASE from env. The Box bootstraps both.

Usage:
  python3 analyze_traffic.py --domain example.com [--months 12] [--competitors a.com,b.com]
                             [--location_code 2840] [--language_code en]
                             [--output result.json | summary]
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error

API_KEY = os.environ.get("MOATT_API_KEY")
API_BASE = os.environ.get("MOATT_API_BASE", "https://api.moatt.com")

if not API_KEY:
    sys.stderr.write(
        "MOATT_API_KEY not set. The Box should export it from /tmp/moatt-env.sh.\n"
    )
    sys.exit(2)


def dfs(endpoint: str, body: list) -> dict:
    """POST to the Moatt DataForSEO proxy."""
    url = f"{API_BASE.rstrip('/')}/v1/proxy/dataforseo/rest"
    payload = json.dumps({"endpoint": endpoint, "body": body}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body_txt = e.read().decode("utf-8", errors="replace")[:500]
        return {"_proxy_error": True, "status": e.code, "body": body_txt}


def main():
    ap = argparse.ArgumentParser(description="SEO traffic analyzer via DataForSEO")
    ap.add_argument("--domain", required=True, help="Target domain (e.g. example.com)")
    ap.add_argument("--months", type=int, default=12, help="History months (default 12)")
    ap.add_argument("--competitors", default="", help="Comma-separated competitor domains")
    ap.add_argument("--location_code", type=int, default=2840, help="DFS location (default US=2840)")
    ap.add_argument("--language_code", default="en", help="DFS language (default en)")
    ap.add_argument("--limit", type=int, default=20, help="Max items for paginated endpoints")
    ap.add_argument(
        "--output",
        default="json",
        help="json (full) or summary (compact table)",
    )
    args = ap.parse_args()

    base_task = {
        "target": args.domain,
        "location_code": args.location_code,
        "language_code": args.language_code,
    }

    result = {"domain": args.domain}

    result["rank_overview"] = dfs(
        "/v3/dataforseo_labs/google/domain_rank_overview/live", [base_task]
    )
    result["historical_rank"] = dfs(
        "/v3/dataforseo_labs/google/historical_rank_overview/live",
        [{**base_task, "limit": args.months}],
    )
    result["relevant_pages"] = dfs(
        "/v3/dataforseo_labs/google/relevant_pages/live",
        [{**base_task, "limit": args.limit}],
    )
    result["ranked_keywords"] = dfs(
        "/v3/dataforseo_labs/google/ranked_keywords/live",
        [{**base_task, "limit": args.limit}],
    )

    competitors = [c.strip() for c in args.competitors.split(",") if c.strip()]
    if competitors:
        result["competitors_domain"] = dfs(
            "/v3/dataforseo_labs/google/competitors_domain/live",
            [{**base_task, "limit": args.limit}],
        )

    if args.output == "summary":
        ro = (
            (result.get("rank_overview") or {}).get("tasks") or [{}]
        )[0].get("result") or [{}]
        item = ro[0] if ro else {}
        metrics = item.get("metrics", {}).get("organic", {}) if isinstance(item, dict) else {}
        print(f"Domain: {args.domain}")
        print(f"Organic keywords: {metrics.get('count', '?')}")
        print(f"ETV (estimated traffic value): {metrics.get('etv', '?')}")
        print(f"Estimated monthly traffic: {metrics.get('estimated_paid_traffic_cost', '?')}")
    else:
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
