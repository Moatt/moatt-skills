---
name: linkedin-profile-post-scraper
description: >
  Scrape recent posts from LinkedIn profiles via Apify. Use when you want to
  watch what specific people are publishing on LinkedIn, track founder/exec
  activity, or gather LinkedIn content for competitive intelligence.
---

# LinkedIn Profile Post Scraper

## Setup

Pull credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json is missing, tell the user to run: `npx moatt login`

Every endpoint uses Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`

Pull recent posts from individual LinkedIn profiles via the Apify `harvestapi/linkedin-profile-posts` actor.

## Quick Start

You need `APIFY_API_TOKEN` as an env var (or pass `--token`). Install the dependency: `pip install requests`.

```bash
# Scrape recent posts from a profile
python3 skills/linkedin-profile-post-scraper/scripts/scrape_linkedin_posts.py \
  --profiles "https://www.linkedin.com/in/example-user" --max-posts 10

# Multiple profiles with keyword filtering
python3 skills/linkedin-profile-post-scraper/scripts/scrape_linkedin_posts.py \
  --profiles "https://www.linkedin.com/in/person1,https://www.linkedin.com/in/person2" \
  --keywords "AI,growth" --days 30

# Summary table
python3 skills/linkedin-profile-post-scraper/scripts/scrape_linkedin_posts.py \
  --profiles "https://www.linkedin.com/in/example-user" --output summary
```

## CLI Reference

| Flag | Default | Description |
|------|---------|-------------|
| `--profiles` | *required* | LinkedIn profile URL(s), comma-separated |
| `--max-posts` | 20 | Max posts to scrape per profile |
| `--keywords` | none | Keywords used as a filter (comma-separated, OR logic) |
| `--days` | 30 | Only include posts from the last N days |
| `--output` | json | Output format: `json` or `summary` |
| `--token` | env var | Apify token (prefer the `APIFY_API_TOKEN` env var) |
| `--timeout` | 300 | Max seconds to wait for the Apify run |

## Cost

Roughly $2 per 1,000 posts scraped. The script prints a cost estimate before running.

## Notes

- No native date filtering — dates are filtered client-side on `postedAt`/`postedDate`
- Profile URLs must be full LinkedIn URLs (e.g. `https://www.linkedin.com/in/username`)
