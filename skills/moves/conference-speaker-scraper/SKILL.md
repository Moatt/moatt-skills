---
name: conference-speaker-scraper
description: >
  Pull speaker names, titles, companies, and bios from conference websites.
  Combines direct HTML scraping with an Apify web scraper fallback for
  JavaScript-heavy sites. Useful for pre-event research and targeted outreach.
---

# Conference Speaker Scraper

## Setup

Pull credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json is missing, tell the user to run: `npx moatt login`

Every endpoint uses Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`

Lift speaker names, titles, companies, and bios from conference /speakers pages. Direct HTML scraping is tried first with multiple extraction strategies; an Apify fallback covers JS-heavy pages.

## Quick Start

Direct mode needs no API key.

```bash
# Scrape speakers from a conference page
python3 skills/conference-speaker-scraper/scripts/scrape_speakers.py \
  --url "https://example.com/speakers"

# Use Apify for JS-heavy sites
python3 skills/conference-speaker-scraper/scripts/scrape_speakers.py \
  --url "https://example.com/speakers" --mode apify

# Custom conference name (otherwise inferred from URL)
python3 skills/conference-speaker-scraper/scripts/scrape_speakers.py \
  --url "https://example.com/speakers" --conference "Sage Future 2026"

# Output formats
python3 skills/conference-speaker-scraper/scripts/scrape_speakers.py --url URL --output json     # default
python3 skills/conference-speaker-scraper/scripts/scrape_speakers.py --url URL --output csv
python3 skills/conference-speaker-scraper/scripts/scrape_speakers.py --url URL --output summary
```

## How It Works

### Direct Mode (default)

The script downloads the page HTML and walks through several extraction strategies in sequence, keeping whichever path yields the most speakers:

1. **Strategy A -- CSS class hints:** Hunts for speaker cards whose class names include "speaker", "presenter", "faculty", "panelist", or "team-member"
2. **Strategy B -- Heading + paragraph patterns:** Detects repeated `<h2>`/`<h3>` followed by `<p>` blocks
3. **Strategy C -- JSON-LD structured data:** Inspects `<script type="application/ld+json">` blocks for speaker entries
4. **Strategy D -- Platform embeds:** Recognises Sched.com/Sessionize structures common across conferences

### Apify Mode

Calls the `apify/cheerio-scraper` actor with a custom page function tuned for common speaker-card selectors. Uses the standard POST/poll/GET dataset workflow.

## CLI Reference

| Flag | Default | Description |
|------|---------|-------------|
| `--url` | *required* | Conference speakers page URL |
| `--conference` | inferred | Conference name (defaults to URL-derived guess) |
| `--mode` | direct | `direct` (HTML scraping) or `apify` (Apify cheerio scraper) |
| `--output` | json | Output format: `json`, `csv`, or `summary` |
| `--token` | env var | Apify token (only required in apify mode) |
| `--timeout` | 300 | Apify run timeout in seconds |

## Output Schema

```json
{
  "name": "Jane Smith",
  "title": "VP of Finance",
  "company": "Acme Corp",
  "bio": "Jane leads the finance transformation at...",
  "linkedin_url": "https://linkedin.com/in/janesmith",
  "image_url": "https://...",
  "conference": "Sage Future 2026",
  "source_url": "https://sagefuture2026.com/speakers"
}
```

## Cost

- **Direct mode:** Free — no API or tokens needed
- **Apify mode:** Backed by `apify/cheerio-scraper` -- a small amount of Apify credit

## Testing Notes

HTML scraping is brittle by nature, and conference sites vary widely. The multi-strategy approach broadens coverage, but JavaScript-heavy pages will demand Apify mode. If direct scraping returns nothing, retry with `--mode apify`.
