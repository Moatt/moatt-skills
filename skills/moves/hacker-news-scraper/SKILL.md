---
name: hacker-news-scraper
description: >
  Query Hacker News stories and comments through the free Algolia API. Needs
  no Apify token. Use when hunting for HN discussions, watching for mentions,
  scanning Show HN launches, or gauging tech community sentiment.
---

# Hacker News Scraper

Searches Hacker News through the free [Algolia HN Search API](https://hn.algolia.com/api). Doesn't require an Apify token or any other API key.

## Quick Start

The only dependency is `pip install requests`.

```bash
# Stories on AI content marketing from the past week
python3 skills/hacker-news-scraper/scripts/search_hn.py \
  --query "AI content marketing" --days 7

# Show HN posts from the past month, summary view
python3 skills/hacker-news-scraper/scripts/search_hn.py \
  --query "" --tags show_hn --days 30 --output summary

# Comments referencing a particular tool
python3 skills/hacker-news-scraper/scripts/search_hn.py \
  --query "LangChain" --tags comment --days 14 --max-results 20
```

## How the Script Works

1. Hits the Algolia HN Search API (`search_by_date` endpoint)
2. Uses `numericFilters=created_at_i>{unix_timestamp}` to filter by date server-side
3. Pages through results until the max-results limit is hit
4. Maps results into a consistent schema
5. Applies any keyword filters client-side
6. Sorts descending by points and emits JSON or a summary

## CLI Reference

| Flag | Default | Description |
|------|---------|-------------|
| `--query` | *required* | Search query |
| `--days` | 7 | Lookback window in days |
| `--tags` | story | Item type: `story`, `comment`, `ask_hn`, `show_hn` |
| `--max-results` | 50 | Max results returned |
| `--keywords` | none | Extra filter terms (comma-separated, OR logic) |
| `--output` | json | Output format: `json` or `summary` |

## Output Format

```json
{
  "id": "12345678",
  "title": "Show HN: My new tool",
  "url": "https://example.com",
  "author": "username",
  "points": 42,
  "num_comments": 15,
  "created_at": "2026-02-18T12:00:00.000Z",
  "hn_url": "https://news.ycombinator.com/item?id=12345678",
  "text": ""
}
```

## Cost

**Free.** No API key, no practical rate limits, no Apify credits consumed.
