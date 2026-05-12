---
name: kol-engager-icp
description: >
  Surface ICP-fit leads from KOL audiences on LinkedIn. Takes a list of KOLs,
  picks their most relevant high-engagement post from the past 30 days,
  pulls engagers (reactors + commenters), pre-filters by position, enriches
  the top profiles, and tags by ICP fit. Cost-controlled: 1 post per KOL.
  Use when someone wants to "find leads from KOL audiences", "scrape engagers
  from influencer posts", or right after running kol-discovery.
tags: [lead-generation]
---

# KOL Engager ICP

## Setup

Load credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json doesn't exist, tell the user to run: `npx moatt login`

All endpoints authenticate via Bearer: `-H "Authorization: Bearer $MOATT_API_KEY"`

Surface ICP-fit leads by scraping engagers from KOL posts on LinkedIn. This is the back half of the KOL pipeline — given a set of KOLs (from kol-discovery or supplied manually), it picks their best post, scrapes everyone who engaged, and filters for your ICP.

**Core principle:** 1 post per KOL. Pick the most relevant, highest-engagement post from the last 30 days. That balances cost against lead quality.

## Phase 0: Intake

Walk the user through these prompts:

### ICP Criteria

1. What does your product/service do?
2. Topic keywords for post relevance filtering (3-5 terms the KOL posts should be about)
3. Target industries/verticals
4. Target job titles/roles (e.g., "VP Operations", "Head of Logistics")
5. Titles to EXCLUDE (e.g., "Software Engineer", "Data Scientist")
6. Competitors to filter out
7. Geographic focus (e.g., "United States")

### KOL Input

8. KOL list — LinkedIn profile URLs (from the kol-discovery output or a manual list)

Save config:
```bash
skills/kol-engager-icp/configs/{client-name}.json
```

Config JSON shape:
```json
{
  "client_name": "example",
  "topic_keywords": ["freight automation", "dispatch operations"],
  "topic_patterns": ["freight.*automat", "dispatch.*oper"],
  "icp_keywords": ["freight", "logistics", "3pl"],
  "target_titles": ["vp operations", "head of logistics", "coo"],
  "exclude_titles": ["software engineer", "data scientist"],
  "tech_vendor_keywords": ["competitor-name", "saas founder"],
  "country_filter": "United States",
  "kol_urls": ["https://www.linkedin.com/in/kol-1/"],
  "days_back": 30,
  "max_posts_per_kol": 20,
  "max_kols": 10,
  "max_enrichment_profiles": 200,
  "mode": "standard"
}
```

## Phase 1: Run the Pipeline

```bash
python3 skills/kol-engager-icp/scripts/kol_engager_icp.py \
  --config skills/kol-engager-icp/configs/{client-name}.json \
  [--test] [--probe] [--yes] [--kols "url1,url2"]
```

**Flags:**
- `--config` (required) — path to the client config JSON
- `--test` — cap at 3 KOLs, 50 enrichment profiles
- `--probe` — try engager scraping against a single post URL and exit
- `--yes` — skip the cost-confirmation prompts
- `--kols` — override the KOL URLs from config (comma-separated)
- `--max-runs` — override the Apify run cap

### Pipeline Steps

**Step 1: Scrape KOL posts** — for each KOL, pull recent posts (last 30 days, up to 20 posts to scan) via `harvestapi/linkedin-profile-posts`.

**Step 2: Select best post per KOL** — filter posts by `topic_keywords`/`topic_patterns` relevance, then keep the ONE with the highest engagement (reactions + comments). Net result: 1 post URL per KOL.

**Step 3: Scrape engagers** — use `harvestapi/linkedin-company-posts` with `scrapeReactions: true, scrapeComments: true` to pull reactors and commenters off each selected post.

**Step 4: Pre-filter before enrichment** — score engagers by position:
- `+3` Commenter (higher intent)
- `+2` Position matches ICP keywords
- `+2` Position matches target titles
- `-5` Position matches exclude titles or vendor keywords
- `+1` Engaged on multiple posts
- Keep only score > 0, cap at `max_enrichment_profiles`

**Step 5: Enrich** — `harvestapi/linkedin-profile-scraper` in batches of 25. Apply the country filter afterward.

**Step 6: ICP classify & export** — bucket as Likely ICP / Possible ICP / Unknown / Tech Vendor. Export CSV.

### Hard Caps

| Parameter | Test | Standard | Full |
|-----------|------|----------|------|
| KOLs processed | 3 | 10 | 20 |
| Posts selected per KOL | 1 | 1 | 1 |
| Max reactions scraped | all | all | all |
| **Max profiles enriched** | **50** | **200** | **500** |
| Est. total cost | ~$0.50 | ~$1.50-2 | ~$5-8 |

### Probe Mode

Run `--probe` first to confirm engager scraping works:

```bash
python3 skills/kol-engager-icp/scripts/kol_engager_icp.py \
  --config skills/kol-engager-icp/configs/{client-name}.json --probe
```

That pulls posts from the first KOL, picks the best post, scrapes engagers from it, and prints a sample. No enrichment, no CSV.

## Phase 2: Review & Refine

Surface results:
- **Per-KOL breakdown** — which KOL's post pulled in the most leads
- **Pre-filter stats** — how many engagers passed the position filter
- **ICP breakdown** — counts per tier
- **Top 15 leads** — name, role, company, KOL source, engagement type

Typical tuning moves:
- **Too many tech vendors** — add terms to `tech_vendor_keywords`
- **Missing ICP leads** — broaden `icp_keywords` or `target_titles`
- **Low-engagement posts being picked** — relax `topic_keywords`
- **Too expensive** — lower `max_enrichment_profiles` or switch to test mode

## Phase 3: Output

CSV lands at `skills/kol-engager-icp/output/{client-name}-kol-engagers-{date}.csv`:

| Column | Description |
|--------|-------------|
| Name | Full name |
| LinkedIn Profile URL | Profile link |
| Role | Parsed from headline |
| Company Name | Parsed from headline |
| Location | From enrichment |
| KOL Source | Which KOL's post they engaged with |
| Post URL | Link to the specific post |
| Engagement Type | Comment or Reaction |
| Comment Text | The comment itself (personalization gold) |
| ICP Tier | Likely ICP / Possible ICP / Unknown / Tech Vendor |
| Pre-Filter Score | Priority score from Step 4 |

## Tools Required

- **Apify API token** — set as `APIFY_API_TOKEN` in `.env`
- **Apify actors used:**
  - `harvestapi/linkedin-profile-posts` (KOL post scraping)
  - `harvestapi/linkedin-company-posts` (engager scraping from posts)
  - `harvestapi/linkedin-profile-scraper` (profile enrichment)

## Example Usage

**Trigger phrases:**
- "Find leads from KOL audiences in [industry]"
- "Scrape engagers from these KOL posts"
- "Run kol-engager-icp for [client]"
- "Who is engaging with [KOL name]'s content?"

**After kol-discovery:**
```bash
# Use KOL URLs from the discovery output
python3 skills/kol-engager-icp/scripts/kol_engager_icp.py \
  --config skills/kol-engager-icp/configs/example.json \
  --kols "https://linkedin.com/in/kol1,https://linkedin.com/in/kol2"
```

**Test mode:**
```bash
python3 skills/kol-engager-icp/scripts/kol_engager_icp.py \
  --config skills/kol-engager-icp/configs/example.json --test
```
