---
name: linkedin-influencer-discovery
description: >
  Surface top LinkedIn influencers and voices by topic, industry, follower count,
  and country. Use when you need to find the top 100 voices in a space, build
  influencer lists for outreach, or identify thought leaders on LinkedIn.
---

# LinkedIn Influencer Discovery

## Setup

Load credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json doesn't exist, tell the user to run: `npx moatt login`

All endpoints authenticate via Bearer: `-H "Authorization: Bearer $MOATT_API_KEY"`

Surface top LinkedIn influencers filtered by topic, country, and follower count using the Apify `powerai/influencer-filter-api-scraper` actor. Queries a database of 3.6M+ influencer profiles narrowed to ones with a LinkedIn presence.

## Quick Start

Needs the `APIFY_API_TOKEN` env var (or `--token` flag). Install the dependency: `pip install requests`.

```bash
# Find top AI influencers with LinkedIn profiles
python3 skills/linkedin-influencer-discovery/scripts/discover_influencers.py \
  --topic "artificial intelligence" --max-results 50 --output summary

# Find SaaS influencers in the US
python3 skills/linkedin-influencer-discovery/scripts/discover_influencers.py \
  --topic "saas" --country "United States of America" --output summary

# Find marketing influencers with email available
python3 skills/linkedin-influencer-discovery/scripts/discover_influencers.py \
  --topic "marketing" --has-email --max-results 100

# Filter to a specific follower range
python3 skills/linkedin-influencer-discovery/scripts/discover_influencers.py \
  --topic "fintech" --min-followers 10000 --max-followers 500000 --output summary
```

## CLI Reference

| Flag | Default | Description |
|------|---------|-------------|
| `--topic` | *required* | Topic to search (e.g. "artificial intelligence", "saas", "marketing") |
| `--category` | none | Category filter (e.g. "technology", "business", "lifestyle") |
| `--country` | none | Country (e.g. "United States of America", "United Kingdom") |
| `--language` | English | Language filter |
| `--min-followers` | 0 | Minimum follower count (client-side filter) |
| `--max-followers` | 0 (unlimited) | Maximum follower count (client-side filter) |
| `--has-email` | false | Only return influencers with an email address |
| `--max-results` | 100 | Max influencers to discover (up to 1000) |
| `--output` | json | Output format: `json` or `summary` |
| `--token` | env var | Apify token (prefer the `APIFY_API_TOKEN` env var) |
| `--timeout` | 600 | Max seconds to wait for the Apify run |

## Cost

About $0.01 per result. 100 influencers ≈ $1.00. The script prints a cost estimate before launching.

## Output Fields

Each influencer result carries (when available):
- `full_name` - Display name
- `username` - Social media handle
- `biography` - Bio text
- `follower_count` - Total followers (across platforms)
- `following_count` - Following count
- `main_topic` - Primary topic/niche
- `topics` - List of associated topics
- `category_name` - Category classification
- `linkedin_url` - LinkedIn profile URL
- `has_email` - Whether email is available
- `external_url` - Website URLs
- `country`, `city` - Location
- `is_verified` - Verification status

## Notes

- Results come back sorted by follower count (descending) by default
- The actor queries a pre-indexed database, not live LinkedIn search
- Follower counts span all platforms, not LinkedIn alone
- `--min-followers` and `--max-followers` filter client-side after results return
- For deeper profile enrichment, run the Apify `harvestapi/linkedin-profile-scraper` actor against the discovered LinkedIn URLs
- For post analysis, run the Apify `harvestapi/linkedin-profile-posts` actor against the discovered LinkedIn URLs
