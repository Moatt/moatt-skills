---
name: reddit-post-finder
description: Scrape and search Reddit posts via Apify. Use when you need to find Reddit threads, track competitor mentions, monitor product feedback, surface pain points, or analyze subreddit activity. Supports keyword filtering, time windows, and subreddit-specific queries.
---

# Reddit Post Finder

## Setup

Read your credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json doesn't exist, tell the user to run: `npx moatt login`

All endpoints use Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`

Scrape Reddit posts and comments using the Apify `trudax/reddit-scraper-lite` actor.

## Quick Start

Needs the `APIFY_API_TOKEN` env var (or `--token` flag).

```bash
# Top posts from r/growthhacking in the last week
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --subreddit growthhacking --days 7 --sort top --time week

# Hot posts across multiple subreddits
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --subreddit "growthhacking,gtmengineering" --days 7 --sort hot

# Keyword-filtered competitor tracking
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --subreddit LLMDevs \
  --keywords "Langfuse,Arize,Langsmith" \
  --days 30

# Readable summary table
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --subreddit growthhacking --days 7 --output summary
```

## How the Script Works

1. Builds full Reddit URLs for each subreddit (e.g. `https://www.reddit.com/r/growthhacking/top/?t=week`)
2. Calls the Apify `trudax/reddit-scraper-lite` actor via REST
3. Polls until the run finishes, then fetches the dataset
4. Applies client-side keyword and date filtering
5. Sorts by upvotes (descending) and emits JSON or a summary

## CLI Reference

| Flag | Default | Description |
|------|---------|-------------|
| `--subreddit` | *required* | Subreddit name(s), comma-separated |
| `--keywords` | none | Keywords to filter on (comma-separated, OR logic) |
| `--days` | 30 | Only include posts from the last N days |
| `--max-posts` | 50 | Max posts to scrape per subreddit |
| `--sort` | top | Sort: `hot`, `top`, `new`, `rising` |
| `--time` | week | Time window for `top` sort: `hour`, `day`, `week`, `month`, `year`, `all` |
| `--output` | json | Output format: `json` or `summary` |
| `--token` | env var | Apify token (prefer the `APIFY_API_TOKEN` env var) |
| `--timeout` | 300 | Max seconds to wait for the Apify run |

## Tips for Small Subreddits

Tiny or low-traffic subreddits (e.g. `r/gtmengineering`) often return zero posts with `--sort hot` because the hot feed is barely populated. Use `--sort top --time week` (or `month`) instead — that pulls the top-ranked posts over the window and reliably returns results.

## Direct API Usage

When calling the Apify API directly (e.g. via curl), the **required fields** are:

```json
{
  "startUrls": [{"url": "https://www.reddit.com/r/growthhacking/top/?t=week"}],
  "maxItems": 50
}
```

Key notes for `trudax/reddit-scraper-lite`:
- Uses `startUrls` with **full Reddit URLs** (not a `searches` array for subreddit browsing)
- Sort/time are controlled via the **URL path** (e.g. `/top/?t=week`), not as separate input fields
- Only `startUrls` and `maxItems` are confirmed-working input fields
- Does **not** support `proxyConfiguration`, `scrollTimeout`, or `searchType`

**Output fields:**
- `dataType` — `"post"` or `"comment"`
- `title` — Post title
- `body` — Post body text
- `communityName` — Subreddit name (no `r/` prefix)
- `upVotes` — Upvote count
- `numberOfComments` — Comment count
- `url` — Full post URL
- `createdAt` — ISO timestamp of when the post was created

## Common Workflows

### 1. Competitor Tracking

```bash
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --subreddit "LLMDevs,MachineLearning,LocalLLaMA" \
  --keywords "Langfuse,Arize,Weights & Biases,Langsmith,Braintrust" \
  --days 30 --sort top --time month
```

### 2. Pain Point Discovery

```bash
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --subreddit LLMDevs \
  --keywords "frustrating,difficult,hard to,wish there was,better way" \
  --days 30
```

### 3. Brand Monitoring

```bash
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --subreddit "LLMDevs,MachineLearning" \
  --keywords "YourProductName" \
  --days 7 --sort new
```

## Important: Always Include Post URLs

When presenting Reddit results to the user, **always include the original post URL** for every post. This is critical so the user can read the full discussion, comments, and context. Never deliver a summary table without links.

## Output Format

Posts return as a JSON array sorted by upvotes. Each post:

```json
{
  "dataType": "post",
  "title": "Post title",
  "body": "Post body...",
  "communityName": "growthhacking",
  "upVotes": 42,
  "numberOfComments": 15,
  "createdAt": "2026-02-18T12:00:00.000Z",
  "url": "https://reddit.com/r/..."
}
```

## Configuration

See `references/apify-config.md` for detailed API configuration, token setup, and rate limits.
