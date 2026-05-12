---
name: google-ad-scraper
description: Pull competitor ads from Google Ads by domain. Returns ad creatives, formats, and campaign metadata. Use for competitive ad research and message analysis.
---

# Google Ads Scraper

## Setup

Pull credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json is missing, tell the user to run: `npx moatt login`

Every endpoint uses Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`

Pulls ads from Google Ads via the Apify `burbn/google-ads-search` actor. Search by domain to surface ad creatives, formats, and campaign metadata.

## Quick Start

You need `APIFY_API_TOKEN` as an env var (or pass `--token`).

```bash
# Search by domain (recommended)
python3 skills/google-ad-scraper/scripts/search_google_ads.py \
  --domain "hubspot.com"

# Search by company name (resolves to domain via transparency center)
python3 skills/google-ad-scraper/scripts/search_google_ads.py \
  --company "Nike"

# Limit results
python3 skills/google-ad-scraper/scripts/search_google_ads.py \
  --domain "hubspot.com" --max-ads 30

# Human-readable summary
python3 skills/google-ad-scraper/scripts/search_google_ads.py \
  --domain "stripe.com" --output summary
```

## How It Works

1. **Domain Input**: Pass the target company's domain directly with `--domain`
2. **Company Name Resolution** (optional): If only `--company` is supplied, the script queries the Google Ads Transparency Center via Apify's web-scraper (Puppeteer) to map the company name onto its advertiser record
3. **Ad Scraping**: Invokes the Apify `burbn/google-ads-search` actor with `{"domain": "...", "maxItems": N}`
4. **Output**: Hands back ads as JSON or a human-readable summary

## CLI Reference

| Flag | Default | Description |
|------|---------|-------------|
| `--domain` | none | Company domain (e.g. hubspot.com) — recommended |
| `--company` | none | Company name (resolved to a domain via the transparency center) |
| `--max-ads` | 50 | Maximum number of ads to return |
| `--output` | json | Output format: `json` or `summary` |
| `--token` | env var | Apify token (prefer the `APIFY_API_TOKEN` env var) |
| `--timeout` | 300 | Max seconds to wait for the Apify run |

You must supply at least one of `--company` or `--domain`.

## Output Fields

Each ad in the output looks like:

```json
{
  "advertiserId": "AR13129532367502835713",
  "advertiserName": "Nike, Inc.",
  "creativeId": "CR12345678901234567890",
  "originalUrl": "https://www.nike.com/",
  "imageUrl": "https://...",
  "variantFormat": "TEXT",
  "variantContent": "Shop the latest Nike shoes...",
  "variants": [...],
  "variantCount": 3,
  "startDate": "2026-01-15"
}
```

**Output fields:**

| Field | Description |
|-------|-------------|
| `advertiserId` | Google Ads advertiser ID |
| `advertiserName` | Display name for the company/advertiser |
| `creativeId` | Unique identifier for the ad creative |
| `originalUrl` | Destination URL the ad targets |
| `imageUrl` | URL of the ad image (when applicable) |
| `variantFormat` | Ad format (TEXT, IMAGE, VIDEO, etc.) |
| `variantContent` | Ad copy/text content |
| `variants` | Array of ad variants |
| `variantCount` | Variant count for this creative |
| `startDate` | Date the ad first appeared |

## Cost

- Ad scraping: Varies with actor pricing; usually a few cents per domain
- Company-name resolution (optional): ~$0.05 (one web-scraper page)

## Common Workflows

### 1. Competitor Ad Research

```bash
python3 skills/google-ad-scraper/scripts/search_google_ads.py \
  --domain "competitor.com" --max-ads 100 --output summary
```

### 2. Compare Multiple Competitors

```bash
# Loop through each competitor domain
for domain in "competitor1.com" "competitor2.com" "competitor3.com"; do
  python3 skills/google-ad-scraper/scripts/search_google_ads.py \
    --domain "$domain" --max-ads 50
done
```

## Limitations

- **Company-name resolution** depends on Puppeteer-based scraping of Google's SPA. It can fall over — `--domain` is more reliable.
- **Ad coverage**: Google surfaces ads only from verified advertisers. Smaller advertisers may not show up.
- **Historical data**: Recent activity dominates the index.
