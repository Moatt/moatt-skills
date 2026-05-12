---
name: linkedin-post-research
description: >
  Search LinkedIn posts by keyword, sorted by engagement or date. Use when researching
  what people are saying about a topic on LinkedIn, finding high-engagement content,
  identifying thought leaders, or surfacing warm leads through post engagement.
  Returns author, post text, reactions, comments, shares, post URL, and date.
  No LinkedIn cookies or login required.
tags: [research, lead-generation]
---

# LinkedIn Post Research

## Setup

Load credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json doesn't exist, tell the user to run: `npx moatt login`

All endpoints authenticate via Bearer: `-H "Authorization: Bearer $MOATT_API_KEY"`

Search LinkedIn for posts matching keywords via Apify. Returns posts sorted by engagement or date, with author info, full text, reaction counts, and direct URLs.

No LinkedIn cookies. No login. Just keywords in, posts out.

## When to Auto-Load

Load this skill when:
- The user says "search LinkedIn posts", "what are people saying about X on LinkedIn", "find LinkedIn content about"
- The user wants high-engagement posts on a topic
- The user wants to find who's posting about a specific topic (thought-leader discovery)
- The user wants to find posts whose commenters they can extract (warm-lead pipeline)

## Prerequisites

### Apify API Token

Needed to search LinkedIn posts. Drop it in `.env`:

```
APIFY_API_TOKEN=your_token_here
```

No LinkedIn cookies, login, or session tokens needed. That's the only setup.

---

## How It Works

1. Accepts one or more keywords
2. Calls the `apimaestro/linkedin-posts-search-scraper-no-cookies` Apify actor
3. Returns posts with author, text, engagement metrics, date, and URL
4. Deduplicates across keywords by `activity_id`
5. Sorts by engagement (total reactions) descending, or by date

## Quick Start

```bash
# Single keyword search
python3 skills/capabilities/linkedin-post-research/scripts/search_posts.py \
  --keyword "AI sourcing" --max-items 20

# Multiple keywords
python3 skills/capabilities/linkedin-post-research/scripts/search_posts.py \
  --keyword "AI sourcing" --keyword "recruiting automation" --max-items 30

# Sort by date (most recent first)
python3 skills/capabilities/linkedin-post-research/scripts/search_posts.py \
  --keyword "AI agents" --sort-by date_posted --max-items 20

# Output as CSV
python3 skills/capabilities/linkedin-post-research/scripts/search_posts.py \
  --keyword "AI agents" --output csv --output-file results.csv

# Summary table
python3 skills/capabilities/linkedin-post-research/scripts/search_posts.py \
  --keyword "AI agents" --output summary
```

## CLI Reference

| Flag | Default | Description |
|------|---------|-------------|
| `--keyword`, `-k` | *required* | Keyword to search (repeatable for multiple keywords) |
| `--max-items` | 50 | Max posts to return per keyword |
| `--sort-by` | `relevance` | Sort order: `relevance` or `date_posted` |
| `--output`, `-o` | `json` | Output format: `json`, `csv`, `summary` |
| `--output-file` | stdout | Write output to a file |
| `--token` | env var | Apify API token (overrides the APIFY_API_TOKEN env var) |
| `--timeout` | 120 | Max seconds to wait for the Apify run |

## Apify Actor Details

**Actor:** `apimaestro/linkedin-posts-search-scraper-no-cookies`

**API call:**
```bash
curl -X POST "https://api.apify.com/v2/acts/apimaestro~linkedin-posts-search-scraper-no-cookies/runs?token=$APIFY_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "AI agents",
    "maxItems": 50,
    "sortBy": "date_posted"
  }'
```

**Polling for results:**
```bash
# Check run status
curl "https://api.apify.com/v2/acts/apimaestro~linkedin-posts-search-scraper-no-cookies/runs/{RUN_ID}?token=$APIFY_API_TOKEN"

# When status is SUCCEEDED, fetch results
curl "https://api.apify.com/v2/datasets/{DATASET_ID}/items?token=$APIFY_API_TOKEN"
```

## Output Schema

```json
{
  "author": "Jane Smith",
  "author_headline": "VP of Sales at Acme Corp",
  "author_profile_url": "https://www.linkedin.com/in/janesmith",
  "keyword": "AI sourcing",
  "reactions": 142,
  "comments": 28,
  "shares": 12,
  "reactions_by_type": {"LIKE": 100, "EMPATHY": 30, "PRAISE": 12},
  "date": "2026-04-01",
  "post_preview": "First 200 chars of the post text...",
  "full_text": "Complete post text...",
  "url": "https://www.linkedin.com/posts/...",
  "activity_id": "7447040447966826496",
  "hashtags": ["#AI", "#sales"],
  "is_repost": false,
  "content_type": "text"
}
```

## Output Columns (CSV)

| Column | Description |
|--------|-------------|
| author | Post author name |
| author_headline | Author's LinkedIn headline |
| author_profile_url | Author's LinkedIn profile URL |
| keyword | Which search keyword matched |
| reactions | Total reaction count |
| comments | Comment count |
| shares | Share count |
| date | Post date (YYYY-MM-DD) |
| post_preview | First ~200 characters |
| url | Direct link to the LinkedIn post |
| activity_id | Unique post identifier |
| hashtags | Comma-separated hashtags |

## Cost

Apify charges per compute usage. About 50 posts costs roughly $0.01-0.05 depending on the actor's pricing tier. The script prints cost info after each run.

## Error Handling

| Error | Fix |
|-------|-----|
| `APIFY_API_TOKEN` not set | Ask the user to add it to `.env` |
| Apify run fails or times out | Retry once. If it still fails, try a broader keyword. |
| 0 results | Keyword may be too narrow. Try broader terms. |
