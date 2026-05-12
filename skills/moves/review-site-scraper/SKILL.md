---
name: review-site-scraper
description: >
  Harvest product reviews off G2, Capterra, and Trustpilot through Apify.
  One script handles every platform via dispatch. Reach for it when you want
  to watch competitor review activity, follow product sentiment, or pull
  customer feedback off review sites.
---

# Review Site Scraper

## Setup

Read your credentials out of ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

When ~/.moatt/credentials.json doesn't exist, ask the user to run: `npx moatt login`

All endpoints authenticate with a Bearer token: `-H "Authorization: Bearer $MOATT_API_KEY"`

Lift product reviews off G2, Capterra, and Trustpilot using the right Apify actor for each platform.

## Quick Start

You'll need `APIFY_API_TOKEN` exported in the environment (or supplied through `--token`). Zero external dependencies — the script uses stdlib `urllib` only.

```bash
# Trustpilot reviews
python3 skills/capabilities/review-site-scraper/scripts/scrape_reviews.py \
  --platform trustpilot \
  --url "https://www.trustpilot.com/review/example.com" \
  --max-reviews 10 --output summary

# G2 reviews with keyword filter
python3 skills/capabilities/review-site-scraper/scripts/scrape_reviews.py \
  --platform g2 \
  --url "https://www.g2.com/products/example/reviews" \
  --keywords "pricing,support"

# Capterra reviews (takes a company name rather than a URL)
python3 skills/capabilities/review-site-scraper/scripts/scrape_reviews.py \
  --platform capterra \
  --company-name "HubSpot CRM" \
  --max-reviews 20
```

## Supported Platforms

| Platform | Actor | Input | Cost |
|----------|-------|-------|------|
| G2 | `focused_vanguard/g2-reviews-scraper` | `--url` for the G2 product page | Free tier available |
| Capterra | `getdataforme/capterra-reviews-scraper-bulk` | `--company-name` (a name, not a URL) | Pay-per-result |
| Trustpilot | `agents/trustpilot-reviews` | `--url` for the Trustpilot review page | ~$0.20/1k reviews |

## CLI Reference

| Flag | Default | Description |
|------|---------|-------------|
| `--platform` | *required* | Pick one of `g2`, `capterra`, or `trustpilot` |
| `--url` | none | Product review page URL — required by G2 and Trustpilot |
| `--company-name` | none | Company name to query (Capterra exclusively) |
| `--max-reviews` | 50 | Upper bound on reviews scraped |
| `--keywords` | none | Keyword filter (comma-separated, OR logic) |
| `--days` | none | Restrict to reviews from the previous N days |
| `--output` | json | Pick output format: `json` or `summary` |
| `--token` | env var | Apify token — prefer setting `APIFY_API_TOKEN` |
| `--timeout` | 300 | Upper bound (in seconds) for the Apify run |

## Normalized Output Schema

Output is normalised across platforms, though each one keeps its own platform-specific fields.

**G2 output fields:**

```json
{
  "platform": "g2",
  "id": "review-id",
  "product_name": "Product Name",
  "title": null,
  "text": "Review body text",
  "rating": 4,
  "author": "Reviewer Name",
  "author_title": "Job Title",
  "author_company": "Company Name",
  "author_company_size": "51-200",
  "author_industry": "Software",
  "date": "2026-02-18",
  "source": "organic",
  "url": "https://..."
}
```

**Capterra output fields:**

```json
{
  "platform": "capterra",
  "title": "Review title",
  "text": "Review body text",
  "overall_rating": 4,
  "ease_of_use": 5,
  "customer_service": 3,
  "features": 4,
  "author": "Reviewer Name",
  "job_title": "Marketing Manager",
  "industry": "Marketing and Advertising",
  "usage_duration": "1-2 years",
  "date": "2026-02-18",
  "url": "https://..."
}
```

**Trustpilot output fields:**

```json
{
  "platform": "trustpilot",
  "id": "review-id",
  "title": "Review title",
  "text": "Review body text",
  "rating": 4,
  "author": "Reviewer Name",
  "date": "2026-02-18T12:00:00.000Z",
  "experienced_date": "2026-02-15T00:00:00.000Z",
  "likes": 2,
  "input_source": "organic",
  "url": "https://..."
}
```
