---
name: champion-tracker
description: >
  Watch product champions for role changes and assess their new employers against your ICP.
  Ingests a CSV of known champions (with LinkedIn URLs), builds a baseline snapshot through
  Apify enrichment, then flags when those champions land at new companies. Each new employer
  is scored on a 0-4 ICP fit scale. Outputs a downloadable CSV listing the movers with
  their qualification verdicts.
tags: [lead-generation]
---

# Champion Tracker

## Setup

Pull credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json is absent, tell the user to run: `npx moatt login`

Every endpoint uses Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`

Spot when product champions move companies and grade their new employers against ICP.

## When to Use

- You have a roster of known product users/champions (sourced from reviews, LinkedIn posts, CRM exports)
- You want to catch the moment they switch employers (a strong re-sell intent signal)
- You want every job change scored against ICP before initiating outreach

## Two Phases

### Phase A: Discover Champions (agent-driven, one-time)

Construct the starting champion list from public data. The agent handles this step manually; no script involved.

1. **Scrape reviews** — Use the `review-site-scraper` skill to pull G2/Trustpilot reviews. Pull reviewer names plus their companies.
2. **Search LinkedIn posts** — Use the `linkedin-post-research` skill (Apify-backed) to surface people who have posted about the product.
3. **Resolve LinkedIn URLs** — Use Fiber `/v1/kitchen-sink/person` (name + company → profile URL) or ContactOut via Orthogonal.
4. **Compile CSV** — Merge the sources into `champions.csv` with the required columns.

### Phase B: Track Job Changes (script-driven, repeatable)

Run `champion_tracker.py` on a recurring schedule.

## Script Usage

### Prerequisites

- `APIFY_API_TOKEN` defined in `.env` (used for LinkedIn profile enrichment)
- Champion CSV containing: `name`, `linkedin_url` (required); `original_company`, `original_title`, `email`, `source`, `notes` (optional)

### Commands

**Initialize baseline** (first execution):
```bash
# Dry run — see cost estimate
python3 skills/champion-tracker/scripts/champion_tracker.py init -i champions.csv --dry-run

# Create baseline
python3 skills/champion-tracker/scripts/champion_tracker.py init -i champions.csv
```

**Check for job changes** (recurring runs):
```bash
# Dry run
python3 skills/champion-tracker/scripts/champion_tracker.py check --dry-run

# Detect changes and output CSV
python3 skills/champion-tracker/scripts/champion_tracker.py check -o changes.csv
```

**View status**:
```bash
python3 skills/champion-tracker/scripts/champion_tracker.py status
```

## Output CSV Columns

| Column | Description |
|--------|-------------|
| champion_name | Full name |
| linkedin_url | LinkedIn profile URL |
| previous_company | Employer at baseline |
| previous_title | Title at baseline |
| new_company | Current (changed) employer |
| new_title | Current title |
| change_detected_date | Date the scan ran |
| position_start_date | Start date for the new role |
| days_since_change | Days elapsed since the new role began |
| icp_score | 0-4 ICP qualification score |
| icp_verdict | Strong Fit / Good Fit / Possible Fit / Weak Fit |
| icp_notes | Scoring breakdown |
| email | Email if available |
| notes | Original notes carried in from the champion CSV |

## ICP Scoring (0-4)

| Signal | Points | What it checks |
|--------|--------|----------------|
| B2B signal | 1.0 | Title hints at sales/SDR/revenue/growth |
| Outbound motion | 1.0 | Sales leadership title (VP Sales, Head of Growth, etc.) |
| Company size | 1.0 / 0.5 | SMB/mid-market = 1.0; unknown = 0.5 (benefit of the doubt) |
| Seniority | 1.0 | VP, Director, Head of, C-level, Founder |

**Verdicts**: Strong Fit (>=3) / Good Fit (>=2) / Possible Fit (>=1.5) / Weak Fit (<1.5)

## Cost

- Approximately $3 per 1,000 LinkedIn profiles enriched
- 50-80 champions ≈ $0.15-0.25 per run
- `--dry-run` always reports the cost before any API call fires

## File Structure

```
skills/champion-tracker/
  SKILL.md                    # This file
  scripts/
    champion_tracker.py       # Main CLI script
  input/
    champions_template.csv    # Template for manual additions
  snapshots/                  # Created at runtime
    baseline.json             # Most recent full snapshot
    archive/                  # Timestamped backup copies
  output/                     # Created at runtime
    changes-YYYY-MM-DD.csv    # Generated output
```

## Dependencies

- Reuses `LinkedInEnricher` from `skills/lead-qualification/scripts/enrich_leads.py`
- Falls back to an inline implementation if the import fails
- Needs: `requests` (Python package), `APIFY_API_TOKEN` (env var)
