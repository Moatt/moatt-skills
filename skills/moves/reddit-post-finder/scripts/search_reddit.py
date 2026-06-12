#!/usr/bin/env python3
"""
Search live Reddit POSTS via KonbiniAPI, through the Karmable/Moatt proxy
(Konbini usage billed to your org).

One vendor, live data: KonbiniAPI fetches current reddit.com data on every
request (nothing cached, nothing stale) and returns rich post metrics — score
(`upVotes`), comment count, author, subreddit.

Modes (pick by which flag you set):
  - GLOBAL keyword search   -> --query "term"            (all of Reddit)
  - SCOPED keyword search   -> --query "term" --subreddit s  (server-side
                               search inside the named subreddit(s))
  - SUBREDDIT browse        -> --subreddit sub1,sub2     (no --query)

Posts only. (Konbini has no global comment search; comment monitoring is out of
scope for this skill.)

Usage:
  # Which subreddits mention "Deel" most (global search -> ranked counts)
  search_reddit.py --query Deel --max-posts 200 --output subreddit-counts

  # Posts mentioning a term, full content
  search_reddit.py --query "Deel payroll" --max-posts 150 --output json

  # Browse a subreddit's top posts this week
  search_reddit.py --subreddit SaaS --sort top --time week
"""

import argparse
import json
import os
import sys
import time as time_mod
from datetime import datetime, timedelta, timezone

import requests

MOATT_API_BASE = os.environ.get("MOATT_API_BASE", "https://api.moatt.com")
MOATT_API_KEY = os.environ.get("MOATT_API_KEY")

# All Konbini calls go through the Moatt proxy, which injects the master Konbini
# key server-side and bills the org. Do NOT set KONBINI_API_KEY in the skill.
PROXY_BASE = f"{MOATT_API_BASE}/v1/proxy/konbini"

# Konbini caps `count` at 100 per request; we paginate with the `cursor` it
# returns to reach larger --max-posts.
PAGE_MAX = 100

# Konbini's two ordering vocabularies differ by endpoint. We expose one --sort
# flag and clamp it to whatever each endpoint accepts (unsupported -> hot).
SORT_CHOICES = ["hot", "new", "top", "rising", "relevance"]
SEARCH_ORDERS = {"relevance", "hot", "top", "new", "comments"}
BROWSE_ORDERS = {"hot", "new", "top", "rising", "controversial"}
TIME_CHOICES = ["hour", "day", "week", "month", "year", "all"]


def get_token(cli_token=None):
    """Get the Moatt proxy token from CLI arg or MOATT_API_KEY env var."""
    token = cli_token or MOATT_API_KEY or os.environ.get("MOATT_API_KEY")
    if not token:
        print("Error: Set MOATT_API_KEY env var (run `npx moatt login`).", file=sys.stderr)
        sys.exit(1)
    return token


def _headers(token):
    return {"Authorization": f"Bearer {token}", "Accept": "application/json"}


def _bare_sub(name):
    """Normalize a subreddit name to bare form (no 'r/' prefix, no slashes)."""
    return (name or "").strip().strip("/").replace("r/", "")


def _sub_from_url(url):
    """Extract the bare subreddit name from a reddit permalink (…/r/<sub>/…)."""
    if not url:
        return ""
    parts = url.split("/r/", 1)
    if len(parts) < 2:
        return ""
    return parts[1].split("/", 1)[0]


def _clamp_sort(sort, allowed):
    """Map the user --sort onto an endpoint's accepted orders (else 'hot')."""
    return sort if sort in allowed else "hot"


def _map_post(p):
    """Map a Konbini RedditPost (ActivityStreams) -> the stable skill schema."""
    url = p.get("url") or p.get("id") or ""
    author = (p.get("attributedTo") or {}).get("preferredUsername") or ""
    return {
        "dataType": "post",
        "title": p.get("name", "") or "",
        "body": p.get("content") or "",
        "communityName": _sub_from_url(url),
        "upVotes": p.get("voteCount"),
        "numberOfComments": p.get("commentCount"),
        # Konbini does not expose upvote ratio — honest null (schema kept stable
        # for downstream skills that read this field).
        "upvoteRatio": None,
        "createdAt": p.get("published", "") or "",
        "url": url,
        "author": author,
        "post_id": p.get("entityId") or "",
    }


def _get_page(token, path, query_params, timeout, retries=3):
    """GET one page from the Konbini proxy; return (items, next_cursor).

    Retries transient upstream failures (502/503/504 and network errors) with
    backoff. Konbini refunds failed requests, so a retry costs nothing extra.
    """
    last_err = None
    for attempt in range(retries):
        try:
            resp = requests.get(
                f"{PROXY_BASE}{path}",
                params=query_params,
                headers=_headers(token),
                timeout=timeout,
            )
            if resp.status_code in (502, 503, 504):
                last_err = requests.exceptions.HTTPError(f"{resp.status_code} transient")
                print(f"  (konbini {resp.status_code} — retry {attempt + 1}/{retries})...", file=sys.stderr)
                time_mod.sleep(2 * (attempt + 1))
                continue
            resp.raise_for_status()
            data = (resp.json() or {}).get("data", {}) or {}
            items = data.get("orderedItems") or data.get("items") or []
            return items, data.get("nextCursor")
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as err:
            last_err = err
            print(f"  (konbini network error — retry {attempt + 1}/{retries})...", file=sys.stderr)
            time_mod.sleep(2 * (attempt + 1))
    raise last_err if last_err else RuntimeError("konbini request failed")


def _paginate(token, path, base_params, max_posts, timeout, label):
    """Page through a Konbini list/search endpoint until max_posts or exhausted."""
    print(f"[posts] konbini {label} (max={max_posts})...", file=sys.stderr)
    collected = []
    cursor = None
    while len(collected) < max_posts:
        params = dict(base_params)
        params["count"] = min(PAGE_MAX, max_posts - len(collected))
        if cursor:
            params["cursor"] = cursor
        items, next_cursor = _get_page(token, path, params, timeout)
        if not items:
            break
        collected.extend(_map_post(p) for p in items)
        if not next_cursor:
            break
        cursor = next_cursor
        time_mod.sleep(0.2)  # be polite between pages
    print(f"[posts] fetched {len(collected)}", file=sys.stderr)
    return collected[:max_posts]


def fetch_posts(token, query, subreddits, sort, time_window, max_posts, timeout):
    """Fetch posts via Konbini.

    - No --subreddit: GLOBAL keyword search (`/search/posts`). This is the moat
      mode ("which subreddits mention X most").
    - --subreddit without --query: BROWSE each named subreddit
      (`/subreddits/{sub}/posts`).
    - --query + --subreddit: SCOPED search (`/subreddits/{sub}/search`) — the
      keyword match runs server-side inside the named subreddit.
    """
    if not subreddits:
        # Global keyword search.
        return _paginate(
            token,
            "/v1/reddit/search/posts",
            {"q": query, "order": _clamp_sort(sort, SEARCH_ORDERS), "time": time_window},
            max_posts,
            timeout,
            f"search '{query}'",
        )

    # Per-subreddit: scoped search when a query is given, else browse the
    # listing. Merge results across subreddits.
    posts = []
    for s in subreddits:
        sub = _bare_sub(s)
        if query:
            posts += _paginate(
                token,
                f"/v1/reddit/subreddits/{sub}/search",
                {"q": query, "order": _clamp_sort(sort, SEARCH_ORDERS), "time": time_window},
                max_posts,
                timeout,
                f"r/{sub} search '{query}'",
            )
        else:
            posts += _paginate(
                token,
                f"/v1/reddit/subreddits/{sub}/posts",
                {"order": _clamp_sort(sort, BROWSE_ORDERS), "time": time_window},
                max_posts,
                timeout,
                f"r/{sub}",
            )
    return posts


# ---- Filtering / formatting --------------------------------------------------

def filter_posts(items, keywords=None, days_back=None):
    """Client-side filtering by keywords and date range."""
    filtered = items

    if days_back is not None:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days_back)
        kept = []
        for p in filtered:
            created = p.get("createdAt")
            if not created:
                kept.append(p)
                continue
            try:
                dt = datetime.fromisoformat(str(created).replace("Z", "+00:00"))
            except ValueError:
                kept.append(p)
                continue
            if dt >= cutoff:
                kept.append(p)
        filtered = kept

    if keywords:
        kw = [k.lower() for k in keywords]
        filtered = [
            p for p in filtered
            if any(k in f"{p.get('title', '')} {p.get('body', '')}".lower() for k in kw)
        ]

    return filtered


def format_summary(items):
    """Human-readable table of posts."""
    lines = [f"{'#':<4} {'Upvotes':<8} {'Comments':<9} {'Subreddit':<20} {'Title / snippet'}"]
    lines.append("-" * 110)
    for i, p in enumerate(items, 1):
        up = p.get("upVotes")
        nc = p.get("numberOfComments")
        up_s = str(up) if up is not None else "-"
        nc_s = str(nc) if nc is not None else "-"
        sub = _bare_sub(p.get("communityName", ""))
        text = (p.get("title") or p.get("body") or "")[:55].replace("\n", " ")
        lines.append(f"{i:<4} {up_s:<8} {nc_s:<9} r/{sub:<18} {text}")
    return "\n".join(lines)


def format_subreddit_counts(items):
    """Aggregate posts by subreddit and render a ranked mention-count table."""
    counts = {}
    for p in items:
        sub = _bare_sub(p.get("communityName", "")) or "(unknown)"
        counts[sub] = counts.get(sub, 0) + 1

    ranked = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)
    lines = [f"{'#':<4} {'Mentions':<10} {'Subreddit'}"]
    lines.append("-" * 50)
    for i, (sub, n) in enumerate(ranked, 1):
        lines.append(f"{i:<4} {n:<10} r/{sub}")
    lines.append("")
    lines.append(f"Total: {len(items)} post(s) across {len(counts)} subreddit(s)")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Search live Reddit posts using KonbiniAPI (via the Moatt proxy)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Which subreddits mention "Deel" most (global search -> ranked counts)
  %(prog)s --query Deel --max-posts 200 --output subreddit-counts

  # Posts mentioning a term, full content
  %(prog)s --query "Deel payroll" --max-posts 150 --output json

  # Top posts from r/growthhacking this week
  %(prog)s --subreddit growthhacking --sort top --time week

  # Search inside one subreddit (server-side scoped search)
  %(prog)s --query Langfuse --subreddit LLMDevs
""",
    )

    parser.add_argument("--query",
                        help="Search keyword(s). Alone: GLOBAL search across all of Reddit — best for "
                             "'which subreddits mention X most'. With --subreddit: server-side search "
                             "inside each named subreddit.")
    parser.add_argument("--subreddit",
                        help="Subreddit name(s), comma-separated. Required unless --query is given. "
                             "Alone: browse each subreddit's listing. With --query: search inside "
                             "each subreddit (server-side).")
    parser.add_argument("--keywords", help="Client-side filter on returned posts (comma-separated, OR logic)")
    parser.add_argument("--days", type=int, default=None,
                        help="Client-side: drop posts older than N days (default: no extra filter; "
                             "use --time for the search window)")
    parser.add_argument("--max-posts", type=int, default=50, help="Max posts to fetch (default: 50)")
    parser.add_argument("--sort", choices=SORT_CHOICES, default="top",
                        help="Sort order (default: top). Clamped per endpoint: 'rising' applies to "
                             "subreddit browse, 'relevance' to search; unsupported maps to 'hot'.")
    parser.add_argument("--time", choices=TIME_CHOICES, default="week",
                        help="Time window (default: week). Applies to top/controversial/comments sorts.")
    parser.add_argument("--token", help="Moatt API token (or set MOATT_API_KEY env var)")
    parser.add_argument("--output", choices=["json", "summary", "subreddit-counts"], default="json",
                        help="Output format (default: json)")
    parser.add_argument("--timeout", type=int, default=60,
                        help="Max seconds to wait per HTTP request (default: 60)")

    args = parser.parse_args()

    if not (args.query or args.subreddit):
        parser.error("provide --query (global search) or --subreddit (scope to subreddits) — at least one is required")

    token = get_token(args.token)
    subreddits = [s.strip() for s in args.subreddit.split(",") if s.strip()] if args.subreddit else []

    items = fetch_posts(token, args.query, subreddits, args.sort, args.time, args.max_posts, args.timeout)

    keywords = [k.strip() for k in args.keywords.split(",")] if args.keywords else []
    items = filter_posts(items, keywords=keywords or None, days_back=args.days)

    # Sort by upvotes desc.
    items.sort(key=lambda p: p.get("upVotes") or 0, reverse=True)

    if args.output == "summary":
        print(format_summary(items))
    elif args.output == "subreddit-counts":
        print(format_subreddit_counts(items))
    else:
        print(json.dumps(items, indent=2))


if __name__ == "__main__":
    main()
