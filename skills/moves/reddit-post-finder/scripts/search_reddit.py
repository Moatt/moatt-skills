#!/usr/bin/env python3
"""
Search and scrape Reddit POSTS and COMMENTS via two live Apify actors, through
the Karmable/Moatt proxy (Apify usage billed to your org).

Two actors, because no single live actor gives BOTH rich post metrics AND global
comment search:

  - POSTS    -> parseforge/reddit-posts-scraper   (live reddit.com; rich metrics:
               score / num comments / upvote ratio)
  - COMMENTS -> trudax/reddit-scraper-lite         (live reddit.com; global comment
               search; NO engagement metrics — comment upvotes/counts are null)

History: the previous single actor (openclawai/reddit-scraper) was PullPush-backed
and the PullPush archive froze at 2025-05-19, so it silently served ~13-month-old
data for both posts and subreddit scrapes. These two actors return live data.

Usage:
  # Which subreddits mention "Deel" most (global post search -> ranked counts)
  search_reddit.py --query Deel --max-posts 200 --output subreddit-counts

  # Posts AND comments mentioning a term, full content
  search_reddit.py --query "Deel payroll" --content both --max-comments 50

  # Scrape a subreddit's recent posts
  search_reddit.py --subreddit SaaS --sort top --time week
"""

import argparse
import json
import os
import sys
import time as time_mod
from datetime import datetime, timedelta, timezone

import requests

POSTS_ACTOR = "parseforge~reddit-posts-scraper"
COMMENTS_ACTOR = "trudax~reddit-scraper-lite"

MOATT_API_BASE = os.environ.get("MOATT_API_BASE", "https://api.moatt.com")
MOATT_API_KEY = os.environ.get("MOATT_API_KEY")

BASE_URL = f"{MOATT_API_BASE}/v1/proxy/apify"
HEADERS = {"Authorization": f"Bearer {MOATT_API_KEY}"} if MOATT_API_KEY else {}

APIFY_PROXY = {"useApifyProxy": True}

# Sorts accepted by BOTH actors (parseforge also has 'controversial', trudax also
# has 'comments'; we expose only the intersection to keep one flag for both).
SORT_CHOICES = ["hot", "new", "top", "rising", "relevance"]
TIME_CHOICES = ["hour", "day", "week", "month", "year", "all"]


def get_token(cli_token=None):
    """Get the Moatt proxy token from CLI arg or MOATT_API_KEY env var."""
    token = cli_token or MOATT_API_KEY or os.environ.get("MOATT_API_KEY")
    if not token:
        print("Error: Set MOATT_API_KEY env var (run `npx moatt login`).", file=sys.stderr)
        sys.exit(1)
    return token


def _iso(value):
    """Coerce epoch-seconds or an ISO string to an ISO8601 'Z' string (or '')."""
    if value is None or value == "":
        return ""
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, tz=timezone.utc).isoformat().replace("+00:00", "Z")
    return str(value)


def _bare_sub(name):
    """Normalize a subreddit name to bare form (no 'r/' prefix, no slashes)."""
    return (name or "").strip().strip("/").replace("r/", "")


def _run_once(actor_id, run_input, token, timeout):
    """Start one Apify actor run via the proxy, poll to completion, return the
    raw dataset items."""
    resp = requests.post(
        f"{BASE_URL}/acts/{actor_id}/runs",
        json=run_input,
        params={"token": token},
        headers=HEADERS,
    )
    resp.raise_for_status()
    run_id = resp.json()["data"]["id"]

    deadline = time_mod.time() + timeout
    status_data = None
    while time_mod.time() < deadline:
        sr = requests.get(
            f"{BASE_URL}/actor-runs/{run_id}",
            params={"token": token},
            headers=HEADERS,
        )
        sr.raise_for_status()
        status_data = sr.json()
        status = status_data["data"]["status"]
        if status == "SUCCEEDED":
            break
        if status in ("FAILED", "ABORTED", "TIMED-OUT"):
            raise RuntimeError(f"Actor {actor_id} run {status}: {json.dumps(status_data['data'])[:400]}")
        time_mod.sleep(2)
    else:
        raise TimeoutError(f"Actor {actor_id} did not finish within {timeout}s")

    dataset_id = status_data["data"]["defaultDatasetId"]
    dr = requests.get(
        f"{BASE_URL}/datasets/{dataset_id}/items",
        params={"token": token, "format": "json"},
        headers=HEADERS,
    )
    dr.raise_for_status()
    return dr.json()


def _start_and_collect(actor_id, run_input, token, timeout, retry_on_empty=0):
    """Run an actor and return its raw dataset items. The live search actors
    occasionally return a SUCCEEDED run with an empty dataset (transient); when
    `retry_on_empty` > 0, re-run that many times before accepting empty."""
    for attempt in range(retry_on_empty + 1):
        raw = _run_once(actor_id, run_input, token, timeout)
        if raw or attempt == retry_on_empty:
            return raw
        print(f"  ({actor_id} returned 0 items — retry {attempt + 1}/{retry_on_empty})...", file=sys.stderr)
        time_mod.sleep(3)
    return raw


# ---- POSTS via parseforge/reddit-posts-scraper ------------------------------

def _map_parseforge_post(p):
    """Map a parseforge post -> the stable schema (with real engagement metrics)."""
    permalink = p.get("permalink") or ""
    url = (
        f"https://www.reddit.com{permalink}"
        if permalink.startswith("/")
        else (permalink or p.get("url", ""))
    )
    return {
        "dataType": "post",
        "title": p.get("title", ""),
        "body": p.get("selfText", ""),
        "communityName": _bare_sub(p.get("subreddit", "")),
        "upVotes": p.get("score"),
        "numberOfComments": p.get("numComments"),
        "upvoteRatio": p.get("upvoteRatio"),
        "createdAt": _iso(p.get("createdUtc") or p.get("createdAt")),
        "url": url,
        "author": p.get("author", ""),
        "post_id": p.get("id") or p.get("parsedId", ""),
    }


def fetch_posts(token, query, subreddits, sort, time_window, max_posts, timeout):
    """Fetch posts via parseforge — global search (--query) or subreddit browse."""
    run_input = {
        "sort": sort,
        "time": time_window,
        "maxItems": max_posts,
        "postsPerSource": max_posts,
        "maxPages": 10,
        "proxyConfiguration": APIFY_PROXY,
    }
    if query:
        run_input["searchQueries"] = [query]
        if len(subreddits) == 1:
            run_input["searchInSubreddit"] = _bare_sub(subreddits[0])
        label = f"search '{query}'"
    else:
        run_input["subreddits"] = [_bare_sub(s) for s in subreddits]
        label = f"r/{', r/'.join(_bare_sub(s) for s in subreddits)}"

    print(f"[posts] parseforge {label} (max={max_posts}, sort={sort}, time={time_window})...", file=sys.stderr)
    raw = _start_and_collect(POSTS_ACTOR, run_input, token, timeout, retry_on_empty=1)
    posts = [_map_parseforge_post(p) for p in raw if (p.get("dataType") in (None, "post"))]
    print(f"[posts] fetched {len(posts)}", file=sys.stderr)
    return posts


# ---- COMMENTS via trudax/reddit-scraper-lite --------------------------------

def _map_trudax_comment(c):
    """Map a trudax comment -> the stable schema. trudax-lite returns no
    engagement metrics, so upVotes / numberOfComments are null (honest absence)."""
    return {
        "dataType": "comment",
        "title": "",
        "body": c.get("body", ""),
        "communityName": _bare_sub(c.get("parsedCommunityName") or c.get("communityName", "")),
        "upVotes": None,
        "numberOfComments": None,
        "upvoteRatio": None,
        "createdAt": _iso(c.get("createdAt") or c.get("created")),
        "url": c.get("url", ""),
        "author": c.get("username", ""),
        "post_id": c.get("parsedId") or c.get("id", ""),
    }


def _subreddit_listing_url(sub, sort, time_window):
    """Full Reddit listing URL for a subreddit (used to browse comments)."""
    sub = _bare_sub(sub)
    if sort in ("hot", "new", "rising"):
        return f"https://www.reddit.com/r/{sub}/{sort}/"
    return f"https://www.reddit.com/r/{sub}/top/?t={time_window}"


def fetch_comments(token, query, subreddits, sort, time_window, max_comments, timeout):
    """Fetch comments via trudax — global comment search (--query) or subreddit
    browse. trudax has no 'controversial'; relevance/hot/top/new/rising all valid."""
    run_input = {
        "searchPosts": False,
        "searchComments": True,
        "searchCommunities": False,
        "searchUsers": False,
        "sort": sort,
        "maxItems": max_comments,
        "maxComments": max_comments,
    }
    if query:
        run_input["searches"] = [query]
        if len(subreddits) == 1:
            run_input["searchCommunityName"] = _bare_sub(subreddits[0])
        label = f"search '{query}'"
    else:
        # No keyword: browse each subreddit's listing; trudax returns the posts'
        # comments alongside, which we filter to dataType == comment below.
        run_input["startUrls"] = [
            {"url": _subreddit_listing_url(s, sort, time_window)} for s in subreddits
        ]
        label = f"r/{', r/'.join(_bare_sub(s) for s in subreddits)}"

    print(f"[comments] trudax {label} (max={max_comments}, sort={sort})...", file=sys.stderr)
    raw = _start_and_collect(COMMENTS_ACTOR, run_input, token, timeout)
    comments = [_map_trudax_comment(c) for c in raw if c.get("dataType") == "comment"]
    print(f"[comments] fetched {len(comments)}", file=sys.stderr)
    return comments


# ---- Filtering / formatting --------------------------------------------------

def filter_posts(items, keywords=None, days_back=None, subreddits=None):
    """Client-side filtering by keywords, date range, and subreddit restriction."""
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

    if subreddits:
        wanted = {_bare_sub(s).lower() for s in subreddits}
        filtered = [p for p in filtered if _bare_sub(p.get("communityName", "")).lower() in wanted]

    return filtered


def format_summary(items):
    """Human-readable table. Posts show upvotes/comments; comments show '-'."""
    lines = [f"{'#':<4} {'Type':<8} {'Upvotes':<8} {'Comments':<9} {'Subreddit':<20} {'Title / snippet'}"]
    lines.append("-" * 110)
    for i, p in enumerate(items, 1):
        up = p.get("upVotes")
        nc = p.get("numberOfComments")
        up_s = str(up) if up is not None else "-"
        nc_s = str(nc) if nc is not None else "-"
        sub = _bare_sub(p.get("communityName", ""))
        text = (p.get("title") or p.get("body") or "")[:55].replace("\n", " ")
        lines.append(f"{i:<4} {p.get('dataType', ''):<8} {up_s:<8} {nc_s:<9} r/{sub:<18} {text}")
    return "\n".join(lines)


def format_subreddit_counts(items):
    """Aggregate items by subreddit and render a ranked mention-count table.
    Counts posts and/or comments depending on --content."""
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
    lines.append(f"Total: {len(items)} item(s) across {len(counts)} subreddit(s)")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Search and scrape Reddit posts + comments using Apify (live data)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Which subreddits mention "Deel" most (global post search -> ranked counts)
  %(prog)s --query Deel --max-posts 200 --output subreddit-counts

  # Posts AND comments mentioning a term, full content
  %(prog)s --query "Deel payroll" --content both --max-comments 50

  # Scrape a subreddit's top posts this week
  %(prog)s --subreddit growthhacking --sort top --time week

  # Restrict a global search to one subreddit
  %(prog)s --query Langfuse --subreddit LLMDevs --content both
""",
    )

    parser.add_argument("--query",
                        help="GLOBAL search keyword(s) across all of Reddit. Best for "
                             "'which subreddits mention X most'. Makes --subreddit optional.")
    parser.add_argument("--subreddit",
                        help="Subreddit name(s), comma-separated. Required unless --query is given. "
                             "With --query, restricts results to these subreddits.")
    parser.add_argument("--content", choices=["posts", "comments", "both"], default="posts",
                        help="What to fetch: posts (parseforge, has upvotes/comment-counts), "
                             "comments (trudax, NO engagement metrics), or both (default: posts)")
    parser.add_argument("--keywords", help="Client-side filter on returned items (comma-separated, OR logic)")
    parser.add_argument("--days", type=int, default=None,
                        help="Client-side: drop items older than N days (default: no extra filter; "
                             "use --time for the actor's window)")
    parser.add_argument("--max-posts", type=int, default=50, help="Max posts to fetch (default: 50)")
    parser.add_argument("--max-comments", type=int, default=50, help="Max comments to fetch (default: 50)")
    parser.add_argument("--sort", choices=SORT_CHOICES, default="top", help="Sort order (default: top)")
    parser.add_argument("--time", choices=TIME_CHOICES, default="week",
                        help="Actor time window for posts (default: week)")
    parser.add_argument("--token", help="Moatt API token (or set MOATT_API_KEY env var)")
    parser.add_argument("--output", choices=["json", "summary", "subreddit-counts"], default="json",
                        help="Output format (default: json)")
    parser.add_argument("--timeout", type=int, default=300,
                        help="Max seconds to wait per Apify run (default: 300)")

    args = parser.parse_args()

    if not (args.query or args.subreddit):
        parser.error("provide --query (global search) or --subreddit (scope to subreddits) — at least one is required")

    token = get_token(args.token)
    subreddits = [s.strip() for s in args.subreddit.split(",") if s.strip()] if args.subreddit else []

    items = []
    if args.content in ("posts", "both"):
        items += fetch_posts(token, args.query, subreddits, args.sort, args.time, args.max_posts, args.timeout)
    if args.content in ("comments", "both"):
        items += fetch_comments(token, args.query, subreddits, args.sort, args.time, args.max_comments, args.timeout)

    # Restrict to named subreddits when more than one was given (single-sub is
    # already pushed down to the actor natively).
    restrict = subreddits if len(subreddits) > 1 else None

    keywords = [k.strip() for k in args.keywords.split(",")] if args.keywords else None
    items = filter_posts(items, keywords=keywords, days_back=args.days, subreddits=restrict)

    # Sort by upvotes desc; comments (null upvotes) sink below scored posts.
    items.sort(key=lambda p: p.get("upVotes") or 0, reverse=True)

    if args.output == "summary":
        print(format_summary(items))
    elif args.output == "subreddit-counts":
        print(format_subreddit_counts(items))
    else:
        print(json.dumps(items, indent=2))


if __name__ == "__main__":
    main()
