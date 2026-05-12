---
name: blog-feed-monitor
description: >
  Pull blog content via RSS feeds (free, requires no API key) with an Apify
  fallback for JavaScript-heavy sites. Reach for this when you want to keep
  tabs on competitor blogs, follow industry publications, or collect posts
  filtered by topic.
---

# Blog Feed Monitor

## Setup

Load your credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json is missing, instruct the user to run: `npx moatt login`

Every endpoint expects Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`

Reads blog posts from RSS/Atom feeds at no cost, with an optional Apify fallback for sites that rely on JavaScript rendering.

## Quick Start

RSS mode runs without an API key.

```bash
# Pull posts from a blog's RSS feed
python3 skills/blog-feed-monitor/scripts/scrape_blogs.py \
  --urls "https://example.com/blog" --days 30

# Several blogs filtered by topic
python3 skills/blog-feed-monitor/scripts/scrape_blogs.py \
  --urls "https://blog1.com,https://blog2.com" --keywords "AI,marketing" --output summary

# Force the Apify path for JS-heavy targets
python3 skills/blog-feed-monitor/scripts/scrape_blogs.py \
  --urls "https://example.com" --mode apify
```

## How It Works

### Auto Mode (default)
1. For each URL, the script tries to locate an RSS/Atom feed by:
   - Inspecting `<link rel="alternate">` tags in the HTML
   - Trying well-known paths: `/feed`, `/rss`, `/atom.xml`, `/feed.xml`, `/rss.xml`, `/blog/feed`, `/index.xml`
2. Parses any feed it finds (RSS 2.0 and Atom both supported)
3. If a URL doesn't yield a feed, falls back to Apify `jupri/rss-xml-scraper` when a token is configured
4. Date and keyword filters are applied locally after retrieval

> **Note:** The Apify fallback actor `jupri/rss-xml-scraper` hasn't been re-validated in a while and may need updating. The pure-RSS path runs reliably on its own.

### RSS Mode
Restricts the script to RSS feeds only — no Apify fallback.

### Apify Mode
Runs the Apify actor directly and skips the RSS discovery step entirely.

## CLI Reference

| Flag | Default | Description |
|------|---------|-------------|
| `--urls` | *required* | Blog URL(s), comma-separated |
| `--keywords` | none | Filter terms (comma-separated, OR logic) |
| `--days` | 30 | Limit posts to the last N days |
| `--max-posts` | 50 | Cap on total posts returned |
| `--mode` | auto | `auto` (RSS + fallback), `rss` (RSS only), `apify` (Apify only) |
| `--output` | json | Output format: `json` or `summary` |
| `--token` | env var | Apify token (only needed for Apify mode/fallback) |
| `--timeout` | 300 | Seconds to wait on the Apify run |

## Cost

- **RSS mode:** No cost — no API, no token required
- **Apify mode:** Runs `jupri/rss-xml-scraper`, consuming minimal Apify credits
