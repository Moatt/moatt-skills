---
name: review-scraper
description: >
  Pull product reviews from G2, Capterra, and Trustpilot via Apify. A single
  script with platform dispatch. Use when you need to monitor competitor reviews,
  track product sentiment, or collect customer feedback from review sites.
---

# Review Scraper

## Setup

Load credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json doesn't exist, tell the user to run: `npx moatt login`

All endpoints authenticate via Bearer: `-H "Authorization: Bearer $MOATT_API_KEY"`

Pull product reviews from G2, Capterra, and Trustpilot through platform-specific Apify actors.

## Quick Start

Needs the `APIFY_API_TOKEN` env var (or `--token` flag). Install the dependency: `pip install requests`.

```bash
# Trustpilot reviews
python3 skills/review-scraper/scripts/scrape_reviews.py \
  --platform trustpilot \
  --url "https://www.trustpilot.com/review/example.com" \
  --max-reviews 10 --output summary

# G2 reviews with keyword filter
python3 skills/review-scraper/scripts/scrape_reviews.py \
  --platform g2 \
  --url "https://www.g2.com/products/example/reviews" \
  --keywords "pricing,support"

# Capterra reviews
python3 skills/review-scraper/scripts/scrape_reviews.py \
  --platform capterra \
  --url "https://www.capterra.com/p/12345/Example"
```

## Supported Platforms

| Platform | Actor | Cost |
|----------|-------|------|
| G2 | `zen-studio/g2-reviews-scraper` | Free tier available |
| Capterra | `imadjourney/capterra-reviews-scraper` | Pay-per-result |
| Trustpilot | `agents/trustpilot-reviews` | ~$0.20/1k reviews |

## CLI Reference

| Flag | Default | Description |
|------|---------|-------------|
| `--platform` | *required* | `g2`, `capterra`, or `trustpilot` |
| `--url` | *required* | Product review page URL |
| `--max-reviews` | 50 | Max reviews to scrape |
| `--keywords` | none | Keywords to filter (comma-separated, OR logic) |
| `--days` | none | Only include reviews from the last N days |
| `--output` | json | Output format: `json` or `summary` |
| `--token` | env var | Apify token (prefer the `APIFY_API_TOKEN` env var) |
| `--timeout` | 300 | Max seconds for the Apify run |

## Normalized Output Schema

Every platform normalizes into the same schema:

```json
{
  "platform": "trustpilot",
  "title": "Review title",
  "text": "Review body text",
  "rating": 4,
  "author": "Reviewer Name",
  "date": "2026-02-18",
  "pros": "What they liked (G2/Capterra only)",
  "cons": "What they disliked (G2/Capterra only)",
  "url": "https://..."
}
```
