---
name: meta-ad-scraper
description: Pull competitor ads from Meta's Ad Library (Facebook, Instagram, Messenger, Threads, WhatsApp). Search by company name, Facebook Page URL, or keyword. Returns creatives, spend estimates, reach, impressions, and campaign details. Useful for competitive ad research, messaging analysis, and creative inspiration.
---

# Meta Ad Library Scraper

## Setup

Read your credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json doesn't exist, tell the user to run: `npx moatt login`

All endpoints use Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`

Pull ads from Meta's Ad Library using the Apify `apify/facebook-ads-scraper` actor. Covers Facebook, Instagram, Messenger, Threads, and WhatsApp.

## Quick Start

Needs the `APIFY_API_TOKEN` env var (or `--token` flag). Install: `pip install requests`.

```bash
# Search ads by company name
python3 skills/meta-ad-scraper/scripts/search_meta_ads.py \
  --company "Nike"

# Add a country filter
python3 skills/meta-ad-scraper/scripts/search_meta_ads.py \
  --company "Shopify" --country US

# Search by keyword (broader than a company name)
python3 skills/meta-ad-scraper/scripts/search_meta_ads.py \
  --company "project management software"

# Cap results
python3 skills/meta-ad-scraper/scripts/search_meta_ads.py \
  --company "HubSpot" --max-ads 20

# Search by Facebook Page URL directly
python3 skills/meta-ad-scraper/scripts/search_meta_ads.py \
  --page-url "https://www.facebook.com/nike"

# Default is active ads only; pass --ad-status all for everything
python3 skills/meta-ad-scraper/scripts/search_meta_ads.py \
  --company "Salesforce" --ad-status all

# Human-readable summary
python3 skills/meta-ad-scraper/scripts/search_meta_ads.py \
  --company "Stripe" --output summary
```

## How It Works

1. Takes a company name, keyword, or Facebook Page URL
2. Constructs a Meta Ad Library URL with the query and filters
3. Calls the Apify `apify/facebook-ads-scraper` actor via REST
4. Polls until the run finishes, then fetches the dataset
5. Parses and emits the ads as JSON or a readable summary

## Resolving Company Name → Ads

The script handles advertiser lookup automatically:
- **Company name**: Builds a search URL like `facebook.com/ads/library/?q=CompanyName` — the Apify actor searches Meta's Ad Library for matching advertisers
- **Page URL**: When you have the Facebook Page URL, pass it via `--page-url` for an exact match
- **Domain**: You can also pass a domain and the script will search for it

No need to hunt down Page IDs by hand. The Apify actor resolves the search internally.

## CLI Reference

| Flag | Default | Description |
|------|---------|-------------|
| `--company` | *required** | Company name or keyword to search |
| `--page-url` | none | Facebook Page URL for an exact advertiser match |
| `--country` | ALL | 2-letter country code (US, GB, DE, etc.) or ALL |
| `--ad-status` | active | `active` or `all` (includes inactive) |
| `--max-ads` | 50 | Max ads to return |
| `--output` | json | Output format: `json` or `summary` |
| `--token` | env var | Apify token (prefer the `APIFY_API_TOKEN` env var) |
| `--timeout` | 300 | Max seconds to wait for the Apify run |

*Either `--company` or `--page-url` is required.

## Output Fields

Each ad in the output contains:

```json
{
  "ad_id": "123456789",
  "page_name": "Nike",
  "page_id": "123456789",
  "ad_text": "Just Do It. Shop the latest...",
  "ad_creative_link_title": "Nike.com",
  "ad_creative_link_description": "Free shipping on orders...",
  "ad_creative_link_url": "https://nike.com/...",
  "image_url": "https://...",
  "video_url": "https://...",
  "ad_delivery_start_time": "2026-01-15",
  "ad_delivery_stop_time": null,
  "currency": "USD",
  "spend_lower": 100,
  "spend_upper": 499,
  "impressions_lower": 1000,
  "impressions_upper": 4999,
  "platforms": ["facebook", "instagram"],
  "status": "ACTIVE"
}
```

## Cost

~$5 per 1,000 ads on the Apify Free plan. Paid plans run cheaper ($3.40-$5/1K).

## Common Workflows

### 1. Competitor Ad Research

```bash
python3 skills/meta-ad-scraper/scripts/search_meta_ads.py \
  --company "Competitor Name" --country US --max-ads 100 --output summary
```

### 2. Industry Ad Landscape

```bash
# Search by keyword to see every advertiser in a space
python3 skills/meta-ad-scraper/scripts/search_meta_ads.py \
  --company "CRM software" --max-ads 50
```

### 3. Compare Multiple Competitors

Run the script per competitor and compare creative direction, messaging, and spend bands.

## Important Notes

- **EU/UK ads are most complete:** Meta archives every ad shown in EU/UK. For US-only ads, coverage may be limited to political/issue ads.
- **Active vs All:** Defaults to active ads. Pass `--ad-status all` to include historical ones.
- **Rate limits:** Apify handles rate limiting internally. For large scrapes, bump `--timeout`.

## Configuration

See `references/apify-config.md` for detailed API configuration, token setup, and rate limits.
