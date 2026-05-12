---
name: linkedin-commenter-extractor
description: >
  Pull commenters off LinkedIn posts via Apify. Returns commenter names, titles,
  profile URLs, and the comment text itself. Use to surface warm leads who are
  already engaging with relevant discussions. No LinkedIn cookies required.
---

# LinkedIn Commenter Extractor

## Setup

Read your credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json doesn't exist, tell the user to run: `npx moatt login`

All endpoints use Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`

Extract names, titles, companies, LinkedIn URLs, and comment text from anyone who commented on a given LinkedIn post. Runs through Apify — no LinkedIn login or cookies needed.

## Quick Start

Needs `requests` and the `APIFY_API_TOKEN` environment variable.

```bash
# Pull commenters from a single post
python3 skills/linkedin-commenter-extractor/scripts/extract_commenters.py \
  --post-url "https://www.linkedin.com/posts/someone_topic-activity-123456789"

# Multiple posts
python3 skills/linkedin-commenter-extractor/scripts/extract_commenters.py \
  --post-url URL1 --post-url URL2

# Cap comments per post
python3 skills/linkedin-commenter-extractor/scripts/extract_commenters.py \
  --post-url URL --max-comments 50

# Different output formats
python3 skills/linkedin-commenter-extractor/scripts/extract_commenters.py --post-url URL --output json
python3 skills/linkedin-commenter-extractor/scripts/extract_commenters.py --post-url URL --output csv
python3 skills/linkedin-commenter-extractor/scripts/extract_commenters.py --post-url URL --output summary

# Dedup across multiple posts
python3 skills/linkedin-commenter-extractor/scripts/extract_commenters.py \
  --post-url URL1 --post-url URL2 --dedup
```

## How It Works

1. Takes one or more LinkedIn post URLs
2. Calls the `harvestapi~linkedin-post-comments` Apify actor (cookies-free)
3. Pulls commenter name, headline (title + company), LinkedIn profile URL, and comment text
4. Parses the headline into separate title and company fields where possible
5. Optionally dedupes across multiple posts by LinkedIn profile URL

## CLI Reference

| Flag | Default | Description |
|------|---------|-------------|
| `--post-url` | *required* | LinkedIn post URL (repeat for multiple posts) |
| `--max-comments` | 100 | Max comments to extract per post |
| `--output` | json | Output format: `json`, `csv`, `summary` |
| `--dedup` | false | Dedup commenters across posts |
| `--token` | env var | Apify API token (overrides APIFY_API_TOKEN env var) |
| `--timeout` | 120 | Max seconds to wait for the Apify run |

## Output Schema

```json
{
  "name": "Jane Smith",
  "headline": "VP of Finance at Acme Corp",
  "title": "VP of Finance",
  "company": "Acme Corp",
  "linkedin_url": "https://www.linkedin.com/in/janesmith",
  "comment_text": "Great insights on AI in accounting...",
  "post_url": "https://www.linkedin.com/posts/...",
  "profile_image_url": "https://..."
}
```

## Cost

Runs on the `harvestapi~linkedin-post-comments` Apify actor — roughly $2 per 1,000 comments. No LinkedIn cookies or login required.
