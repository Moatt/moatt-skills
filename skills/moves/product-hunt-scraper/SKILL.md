---
name: product-hunt-scraper
description: >
  Pull trending Product Hunt launches via Apify. Reach for this when you need
  to surface newly-launched products, track competitor activity on Product
  Hunt, or scan the startup ecosystem for noteworthy launches.
---

# Product Hunt Scraper

## Setup

Load your credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json is missing, instruct the user to run: `npx moatt login`

All endpoints require Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`

Scrapes trending Product Hunt launches through the Apify `maximedupre/product-hunt-scraper` actor.

**Output fields:** Each product carries `name`, `tagline`, `description`, `url` (Product Hunt URL), and any additional fields the actor surfaces.

## Quick Start

Needs `APIFY_API_TOKEN` (env var) or `--token` flag.

```bash
# Top picks from today
python3 skills/product-hunt-scraper/scripts/scrape_producthunt.py \
  --time-period daily --max-products 10 --output summary

# Weekly products filtered by keyword
python3 skills/product-hunt-scraper/scripts/scrape_producthunt.py \
  --time-period weekly --keywords "AI,marketing" --output summary

# Monthly leaderboard as JSON
python3 skills/product-hunt-scraper/scripts/scrape_producthunt.py \
  --time-period monthly --max-products 50
```

## CLI Reference

| Flag | Default | Description |
|------|---------|-------------|
| `--time-period` | weekly | `daily`, `weekly`, or `monthly` |
| `--max-products` | 50 | Cap on products returned |
| `--keywords` | none | Filter terms (comma-separated, OR logic) |
| `--output` | json | Output format: `json` or `summary` |
| `--token` | env var | Apify token (prefer the `APIFY_API_TOKEN` env var) |
| `--timeout` | 300 | Max seconds the Apify run is allowed to take |

## Notes

- Keyword filtering runs client-side against product name, tagline, and description
- Results come back sorted by upvote count (highest first)
