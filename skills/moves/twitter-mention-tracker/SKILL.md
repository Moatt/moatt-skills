---
name: twitter-mention-tracker
description: >
  Search and pull Twitter/X posts via Apify. Reach for this when looking up
  tweets, watching for brand mentions, monitoring competitors on Twitter, or
  analyzing conversations on the platform. Date filtering uses Twitter's
  native since:/until: operators for reliable server-side scoping.
---

# Twitter Mention Tracker

## Setup

Load your credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json is missing, instruct the user to run: `npx moatt login`

All endpoints require Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`

Pulls Twitter/X posts via the Apify `apidojo/tweet-scraper` actor.

## Quick Start

Needs `APIFY_API_TOKEN` (env var) or `--token` flag.

```bash
# Search with a date range (recommended — uses Twitter's native since:/until: syntax)
python3 skills/twitter-mention-tracker/scripts/search_twitter.py \
  --query "YourCompany" --since 2026-02-15 --until 2026-02-23

# Quick look at recent mentions
python3 skills/twitter-mention-tracker/scripts/search_twitter.py \
  --query "@yourhandle" --max-tweets 20 --output summary

# Search without any date scoping
python3 skills/twitter-mention-tracker/scripts/search_twitter.py \
  --query "AI content marketing" --max-tweets 50
```

## Date Filtering

**Important:** The `apidojo/tweet-scraper` actor's own date parameters aren't dependable.
The script works around this by embedding `since:YYYY-MM-DD` and `until:YYYY-MM-DD` straight
into the search string, leveraging Twitter's native advanced-search operators. That keeps
the date filter applied on the server side where it actually works.

## How the Script Works

1. Builds a search string with the quoted query plus date operators appended
2. Calls the Apify `apidojo/tweet-scraper` actor via its REST API
3. Polls until the run completes, then pulls the dataset
4. Removes duplicates by tweet ID/URL
5. Applies any client-side keyword filters
6. Sorts descending by likes and emits JSON or a summary

## CLI Reference

| Flag | Default | Description |
|------|---------|-------------|
| `--query` | *required* | Search query (gets quoted in the Twitter search) |
| `--since` | none | Start date YYYY-MM-DD (inclusive) |
| `--until` | none | End date YYYY-MM-DD (exclusive) |
| `--max-tweets` | 50 | Max tweets to scrape |
| `--keywords` | none | Extra filter terms (comma-separated, OR logic) |
| `--output` | json | Output format: `json` or `summary` |
| `--token` | env var | Apify token (prefer the `APIFY_API_TOKEN` env var) |
| `--timeout` | 300 | Max seconds the Apify run is allowed to take |

## Direct API Usage

```json
{
  "searchTerms": ["\"YourCompany\" since:2026-02-15 until:2026-02-22"],
  "maxTweets": 50,
  "searchMode": "live"
}
```

## Output Format

Tweets are returned as a JSON array sorted by likes. Each tweet contains:

```json
{
  "id": "...",
  "text": "Tweet text...",
  "fullText": "Full tweet text...",
  "likeCount": 42,
  "retweetCount": 5,
  "replyCount": 3,
  "viewCount": 1200,
  "createdAt": "2026-02-18T12:00:00.000Z",
  "author": {"userName": "handle", "name": "Display Name", ...},
  "twitterUrl": "https://twitter.com/..."
}
```

## Common Workflows

### Competitor Monitoring
```bash
python3 skills/twitter-mention-tracker/scripts/search_twitter.py \
  --query "CompetitorName" --since 2026-02-15 --until 2026-02-23 --output summary
```

### Brand Mention Tracking
```bash
python3 skills/twitter-mention-tracker/scripts/search_twitter.py \
  --query "@YourHandle OR \"YourBrand\"" --max-tweets 100
```
