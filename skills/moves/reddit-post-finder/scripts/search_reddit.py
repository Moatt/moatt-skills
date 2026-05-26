#!/usr/bin/env python3
"""
Search Reddit posts using Apify Reddit Scraper Lite.
Supports keyword filtering, subreddit filtering, and time range filtering.

Usage:
  python3 search_reddit.py --subreddit growthhacking --days 7 --max-posts 20
  python3 search_reddit.py --subreddit "growthhacking,gtmengineering" --days 7 --sort top --time week
  python3 search_reddit.py --subreddit LLMDevs --keywords "Langfuse,Arize" --days 30
"""

import json
import os
import sys
import argparse
import requests
import time as time_mod
from datetime import datetime, timedelta, timezone


ACTOR_ID = "openclawai~reddit-scraper"

MOATT_API_BASE = os.environ.get("MOATT_API_BASE", "https://api.moatt.com")
MOATT_API_KEY = os.environ.get("MOATT_API_KEY")

BASE_URL = f"{MOATT_API_BASE}/v1/proxy/apify"
HEADERS = {"Authorization": f"Bearer {MOATT_API_KEY}"} if MOATT_API_KEY else {}


def get_token(cli_token=None):
    """Get API token from CLI arg, MOATT_API_KEY, or MOATT_API_KEY env var."""
    token = cli_token or MOATT_API_KEY or os.environ.get("MOATT_API_KEY")
    if not token:
        print("Error: Set MOATT_API_KEY env var (run `npx moatt login`).", file=sys.stderr)
        sys.exit(1)
    return token


def build_subreddit_urls(subreddits, sort="top", time="week"):
    """
    Build full Reddit URLs for each subreddit.

    The Apify actor requires startUrls with full URLs, not bare subreddit names.
    Sort and time are embedded in the URL path/query.

    Args:
        subreddits: List of subreddit names (without r/ prefix)
        sort: "hot", "top", "new", or "rising"
        time: "hour", "day", "week", "month", "year", "all" (only used with "top" sort)

    Returns:
        List of {"url": "..."} dicts for the actor's startUrls parameter
    """
    urls = []
    for sub in subreddits:
        sub = sub.strip().strip("/").replace("r/", "").replace("https://www.reddit.com/r/", "")
        if sort == "top":
            url = f"https://www.reddit.com/r/{sub}/top/?t={time}"
        elif sort in ("hot", "new", "rising"):
            url = f"https://www.reddit.com/r/{sub}/{sort}/"
        else:
            url = f"https://www.reddit.com/r/{sub}/top/?t={time}"
        urls.append({"url": url})
    return urls


def run_apify_actor(token, subreddits, max_posts=100, timeout=300, sort="top", time_window="week"):
    """
    Run the openclawai/reddit-scraper actor and return results in the original
    Reddit Scraper Lite output shape (upVotes / numberOfComments / communityName).

    Verified 2026-05-26: 6.7s for 5 posts at $0.0001 — ~14× faster, 400× cheaper
    than trudax/reddit-scraper-lite. Output field names differ; we map them
    inline so callers (build_subreddit_urls, summary table, etc.) keep working.

    Args:
        token: Moatt API token
        subreddits: List of subreddit names (without r/ prefix) OR list of URLs
                    (we extract the subreddit name from URLs for the new actor)
        max_posts: Total posts wanted across all subreddits
        timeout: Max seconds per actor run
        sort: "top" | "hot" | "new" | "rising" (informational — actor sorts by recency)
        time_window: ignored by openclawai/reddit-scraper

    Returns:
        List of post dicts with keys: title, body, upVotes, numberOfComments,
        communityName, url, createdAt, dataType (matches the original schema).
    """
    # The actor takes ONE subreddit per run; loop and aggregate.
    aggregated = []
    per_run_limit = max(1, max_posts)
    for sub in subreddits:
        # Accept either raw subreddit name or full URL.
        if isinstance(sub, dict):
            sub = sub.get("url", "")
        sub_name = (
            sub.replace("https://www.reddit.com/r/", "")
            .replace("https://reddit.com/r/", "")
            .replace("r/", "")
            .strip("/")
            .split("/")[0]
        )
        run_input = {
            "action": "scrape_subreddit",
            "subreddit": sub_name,
            "limit": per_run_limit,
        }

        # Start the actor run
        print(f"Starting Apify actor run (r/{sub_name}, limit={per_run_limit})...", file=sys.stderr)
        resp = requests.post(
            f"{BASE_URL}/acts/{ACTOR_ID}/runs",
            json=run_input,
            params={"token": token},
            headers=HEADERS,
        )
        resp.raise_for_status()
        run_data = resp.json()
        run_id = run_data["data"]["id"]

        # Poll for completion
        deadline = time_mod.time() + timeout
        status_data = None
        while time_mod.time() < deadline:
            status_resp = requests.get(
                f"{BASE_URL}/actor-runs/{run_id}",
                params={"token": token},
                headers=HEADERS,
            )
            status_resp.raise_for_status()
            status_data = status_resp.json()
            status = status_data["data"]["status"]

            if status == "SUCCEEDED":
                break
            if status in ("FAILED", "ABORTED", "TIMED-OUT"):
                raise RuntimeError(f"Actor run {status}: {json.dumps(status_data['data'], indent=2)}")
            time_mod.sleep(2)
        else:
            raise TimeoutError(f"Actor run did not complete within {timeout}s")

        # Fetch dataset items
        dataset_id = status_data["data"]["defaultDatasetId"]
        dataset_resp = requests.get(
            f"{BASE_URL}/datasets/{dataset_id}/items",
            params={"token": token, "format": "json"},
            headers=HEADERS,
        )
        dataset_resp.raise_for_status()
        raw_posts = dataset_resp.json()
        print(f"  r/{sub_name}: fetched {len(raw_posts)} posts.", file=sys.stderr)

        # Map openclawai schema → original schema so existing filters/summary work.
        for p in raw_posts:
            permalink = p.get("permalink", "")
            url = (
                f"https://www.reddit.com{permalink}"
                if permalink and permalink.startswith("/")
                else permalink
            )
            aggregated.append({
                "dataType": "post",
                "title": p.get("title", ""),
                "body": p.get("body", ""),
                "communityName": p.get("subreddit_name", sub_name),
                "upVotes": p.get("num_upvotes", 0),
                "numberOfComments": p.get("num_comments", 0),
                "createdAt": p.get("post_timestamp", ""),
                "url": url,
                "author": p.get("author_name", ""),
                "post_id": p.get("post_id", ""),
            })

    return aggregated


def filter_posts(posts, keywords=None, days_back=None):
    """
    Client-side filtering by keywords and date range.

    Args:
        posts: List of post dicts from Apify
        keywords: Optional list of keywords (OR logic, case-insensitive)
        days_back: Optional number of days; posts older than this are dropped

    Returns:
        Filtered list of posts
    """
    filtered = posts

    # Date filter
    if days_back is not None:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days_back)
        date_filtered = []
        for p in filtered:
            created = p.get("createdAt") or p.get("created_utc")
            if created is None:
                date_filtered.append(p)
                continue
            if isinstance(created, str):
                try:
                    dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                except ValueError:
                    date_filtered.append(p)
                    continue
            elif isinstance(created, (int, float)):
                dt = datetime.fromtimestamp(created, tz=timezone.utc)
            else:
                date_filtered.append(p)
                continue
            if dt >= cutoff:
                date_filtered.append(p)
        filtered = date_filtered

    # Keyword filter (OR logic)
    if keywords:
        kw_lower = [k.lower() for k in keywords]
        kw_filtered = []
        for p in filtered:
            text = f"{p.get('title', '')} {p.get('body', '')}".lower()
            if any(kw in text for kw in kw_lower):
                kw_filtered.append(p)
        filtered = kw_filtered

    return filtered


def format_summary(posts):
    """Format posts as a human-readable summary table."""
    lines = []
    lines.append(f"{'#':<4} {'Upvotes':<9} {'Comments':<10} {'Subreddit':<20} {'Title'}")
    lines.append("-" * 100)
    for i, p in enumerate(posts, 1):
        title = p.get("title", "")[:60]
        upvotes = p.get("upVotes", 0)
        comments = p.get("numberOfComments", 0)
        sub = p.get("communityName", "")
        if sub.startswith("r/"):
            sub = sub[2:]
        lines.append(f"{i:<4} {upvotes:<9} {comments:<10} r/{sub:<18} {title}")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Search Reddit posts using Apify",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Top posts from r/growthhacking in last week
  %(prog)s --subreddit growthhacking --days 7 --sort top --time week

  # Hot posts from multiple subreddits
  %(prog)s --subreddit "growthhacking,gtmengineering" --days 7 --sort hot

  # Search with keyword filtering
  %(prog)s --subreddit LLMDevs --keywords "Langfuse,Arize" --days 30

  # Human-readable summary
  %(prog)s --subreddit growthhacking --days 7 --output summary
""",
    )

    parser.add_argument("--subreddit", required=True,
                        help="Subreddit name(s), comma-separated (e.g. 'growthhacking,gtmengineering')")
    parser.add_argument("--keywords", help="Keywords to filter for (comma-separated, OR logic)")
    parser.add_argument("--days", type=int, default=30, help="How many days back to include (default: 30)")
    parser.add_argument("--max-posts", type=int, default=50, help="Max posts to scrape per subreddit (default: 50)")
    parser.add_argument("--sort", choices=["hot", "top", "new", "rising"], default="top",
                        help="Sort order (default: top)")
    parser.add_argument("--time", choices=["hour", "day", "week", "month", "year", "all"], default="week",
                        help="Time window for 'top' sort (default: week)")
    parser.add_argument("--token", help="Apify API token (or set MOATT_API_KEY env var)")
    parser.add_argument("--output", choices=["json", "summary"], default="json",
                        help="Output format (default: json)")
    parser.add_argument("--timeout", type=int, default=300,
                        help="Max seconds to wait for Apify run (default: 300)")

    args = parser.parse_args()

    token = get_token(args.token)

    # Parse subreddits
    subreddits = [s.strip() for s in args.subreddit.split(",") if s.strip()]

    # openclawai/reddit-scraper takes a bare subreddit name per run (looped
    # inside run_apify_actor). The build_subreddit_urls helper is kept for
    # backwards-compat with any external caller that still hands us URLs.
    print(f"Scraping {len(subreddits)} subreddit(s): {', '.join(f'r/{s}' for s in subreddits)}", file=sys.stderr)

    # Run actor
    posts = run_apify_actor(token, subreddits, max_posts=args.max_posts, timeout=args.timeout, sort=args.sort)

    # Parse keywords
    keywords = None
    if args.keywords:
        keywords = [k.strip() for k in args.keywords.split(",")]

    # Filter
    posts = filter_posts(posts, keywords=keywords, days_back=args.days)

    # Sort by upvotes descending
    posts.sort(key=lambda p: p.get("upVotes", 0), reverse=True)

    # Output
    if args.output == "summary":
        print(format_summary(posts))
    else:
        print(json.dumps(posts, indent=2))


if __name__ == "__main__":
    main()
