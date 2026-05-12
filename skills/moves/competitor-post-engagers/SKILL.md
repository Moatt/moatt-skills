---
name: competitor-post-engagers
description: >
  Generate leads by harvesting the engagers off a competitor's strongest LinkedIn posts.
  Takes one or more company page URLs, pulls recent posts, ranks them by engagement,
  picks the top N, lists every reactor and commenter, sorts by ICP fit, and ships
  a CSV. Use this when someone wants to "surface leads engaging with competitor
  content" or "pull people interacting with [company]'s LinkedIn posts".
tags: [lead-generation]
---

# Competitor Post Engagers

## Setup

Load credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json is missing, tell the user to run: `npx moatt login`

Every endpoint authenticates via Bearer: `-H "Authorization: Bearer $MOATT_API_KEY"`

Hunt down ICP-fit prospects by scraping engagers from a competitor's best-performing LinkedIn posts. Given one or more company page URLs, this skill locates their top-engagement recent posts, lifts every reaction and comment, and ranks the result by ICP match.

**Core principle:** Pull all posts in a single call per company, then rank and slice locally to find the top N. That keeps Apify cost down while preserving lead quality.

## Phase 0: Intake

Walk the user through these prompts:

### Target Companies

1. LinkedIn company page URL(s) to harvest (e.g., `https://www.linkedin.com/company/11x-ai/`)
2. Time window — how many days back to consider (default: 30)
3. Top N posts per company whose engagers you want pulled (default: 1)

### ICP Criteria

4. ICP keywords — job-title or role terms that mark a good lead (e.g., "sales", "SDR", "revenue")
5. Exclude keywords — roles to drop (e.g., "software engineer", "designer")
6. Geographic focus (optional, e.g., "United States")

Drop the config in the working directory (or wherever the user prefers):
```bash
competitor-post-engagers-config.json
```

Config JSON shape:
```json
{
  "name": "<run-name>",
  "company_urls": ["https://www.linkedin.com/company/<competitor>/"],
  "days_back": 30,
  "max_posts": 50,
  "max_reactions": 500,
  "max_comments": 200,
  "top_n_posts": 1,
  "icp_keywords": ["sales", "revenue", "growth", "SDR", "BDR", "outbound"],
  "exclude_keywords": ["software engineer", "developer", "designer"],
  "enrich_companies": true,
  "competitor_company_names": ["<competitor-name>"],
  "industry_keywords": ["freight", "logistics", "trucking", "transportation", "3pl", "supply chain", "carrier", "brokerage", "shipping", "warehousing"],
  "output_dir": "output"
}
```

- `enrich_companies` — toggles Apollo company enrichment (default: true). Set false or pass `--skip-company-enrich` to bypass it.
- `competitor_company_names` — company names to skip during enrichment (the competitor itself).
- `industry_keywords` — industry terms that flag ICP fit. Matched against Apollo's industry field.

`output_dir` is resolved relative to the script directory by default. Pass an absolute path to write output somewhere specific.

## Phase 1: Run the Pipeline

```bash
python3 skills/competitor-post-engagers/scripts/competitor_post_engagers.py \
  --config competitor-post-engagers-config.json \
  [--test] [--yes] [--skip-company-enrich] [--top-n 3] [--max-runs 30]
```

**Flags:**
- `--config` (required) — path to the config JSON
- `--test` — small limits (20 posts, 50 profiles, 1 top post)
- `--yes` — skip the cost confirmation prompts
- `--skip-company-enrich` — skip the Apollo company enrichment pass (saves credits)
- `--top-n` — override `top_n_posts` from the config
- `--max-runs` — override the Apify run cap

### Pipeline Steps

**Step 1: Scrape company posts + engagers** — for each company URL, fire one Apify call using `harvestapi/linkedin-company-posts` with `scrapeReactions: true, scrapeComments: true`. The dataset comes back with posts, reactions, and comments in one shot.

**Step 2: Rank & select top posts** — filter posts to the time window (`days_back`), rank by total engagement (reactions + comments), pick the top N per company. Then pull engagers (reactors + commenters) only from those selected posts. Dedupe by name. Score engagers by position:
- `+3` Commenter (higher intent)
- `+2` Position matches ICP keywords
- `-5` Position matches exclude keywords

**Step 3: Company enrichment (Apollo)** — pull unique company names off engagers, call `apollo.enrich_organization(name=...)` per company. Returns industry, employee count, description, and location. About 1 Apollo credit per unique company. Merge the enriched data back into every engager from that company. Skip with `--skip-company-enrich` or `"enrich_companies": false`.

**Step 4: ICP classify & export** — bucket as Likely ICP / Possible ICP / Unknown / Tech Vendor. Classification draws on both headline keyword matches AND company industry data (from Step 3) — if the engager's company industry hits `industry_keywords`, they get tagged "Likely ICP" regardless of role. Export CSV.

### Cost Estimates

| Parameter | Test | Standard |
|-----------|------|----------|
| Posts scraped per company | 20 | 50 |
| Max reactions | 50 | 500 |
| Max comments | 50 | 200 |
| Est. Apify cost (1 company) | ~$0.10 | ~$0.50-1 |
| Est. Apollo credits (company enrich) | ~10-20 | ~30-80 unique companies |
| Est. Apollo cost | ~$0.05-0.10 | ~$0.15-0.40 |

## Phase 2: Review & Refine

Show the user:
- **Post selection** — which posts won and why (engagement counts, preview)
- **Per-company breakdown** — lead volume from each competitor
- **ICP breakdown** — counts per tier
- **Top 15 leads** — name, role, company, engagement type

Common tuning moves:
- **Too many irrelevant leads** — tighten `icp_keywords` or add `exclude_keywords`
- **Missing ICP leads** — broaden `icp_keywords`
- **Wrong posts selected** — increase `top_n_posts` or adjust `days_back`
- **Too expensive** — use `--test` mode or trim `max_reactions`/`max_comments`

## Phase 3: Output

CSV lands at `{output_dir}/{name}-engagers-{date}.csv`:

| Column | Description |
|--------|-------------|
| Name | Full name |
| LinkedIn URL | Profile link |
| Role | Parsed from headline |
| Company | Parsed from headline |
| Company Industry | From Apollo enrichment |
| Company Size | Apollo-estimated employee count |
| Company Description | Short Apollo description |
| Company Location | City, State, Country from Apollo |
| Source Page | Which competitor page produced this engager |
| Post URL | Link to the specific post |
| Post Preview | First 120 chars of post content |
| Engagement Type | Comment or Reaction |
| Comment Text | The comment itself (personalization gold) |
| ICP Tier | Likely ICP / Possible ICP / Unknown / Tech Vendor |
| Pre-Filter Score | Priority score from the pre-filter |

## Tools Required

- **Apify API token** — set as `APIFY_API_TOKEN` in `.env`
- **Apollo API key** — set as `APOLLO_API_KEY` in `.env` (powers company enrichment)
- **Apify actors used:**
  - `harvestapi/linkedin-company-posts` (post + engager scraping)
- **Apollo endpoints used:**
  - `organizations/enrich` (company industry/size lookup, 1 credit per company)

## Example Usage

**Trigger phrases:**
- "Find leads engaging with [competitor]'s LinkedIn posts"
- "Scrape engagers from [company]'s top posts"
- "Who is interacting with [competitor]'s content?"
- "Run competitor-post-engagers for [company]"

**Test mode:**
```bash
python3 skills/competitor-post-engagers/scripts/competitor_post_engagers.py \
  --config competitor-post-engagers-config.json --test --yes
```

**Full run:**
```bash
python3 skills/competitor-post-engagers/scripts/competitor_post_engagers.py \
  --config competitor-post-engagers-config.json --yes
```
