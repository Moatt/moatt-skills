---
name: job-posting-intent
version: 1.1.0
description: >
  Surface buying intent from job postings. When a company opens a role in your problem
  area, it has earmarked budget and is actively reasoning about that problem. This
  skill locates those companies, qualifies them, pulls personalization context, and
  exports everything to a Google Sheet. It does NOT run outreach — it just delivers
  qualified leads with reasoning.
tags: [lead-generation, outreach]
---

# Job Posting Intent Detection

## Setup

Pull credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

When ~/.moatt/credentials.json is missing, instruct the user to run: `npx moatt login`

Every endpoint uses Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`

Locate companies hiring for roles tied to the problem you solve. A job posting is a **budget signal** — the company has committed money to an issue your product addresses.

The output flows straight into a **Google Sheet** with signal strength, decision-maker hints, outreach angles, and personalization context.

## Why This Works

When a company opens a job, they've:
- Earmarked budget (headcount is expensive)
- Acknowledged the problem
- Begun working on it

If your product helps them solve the problem faster, cheaper, or better than a hire alone, the timing is perfect.

## Cost

**Apify Actor:** `harvestapi/linkedin-job-search` (pay-per-event)

| Component | Cost |
|-----------|------|
| Actor start (per run) | $0.001 |
| Per job result | $0.001 |
| Apify platform fee | +20% |

**Typical run costs:**
| Scenario | Titles | Jobs/title | Runs | Est. Cost |
|----------|--------|------------|------|-----------|
| Quick scan | 3 | 25 | 3 | ~$0.09 |
| Standard | 5 | 25 | 5 | ~$0.16 |
| Deep search | 5 | 100 | 5 | ~$0.60 |
| Multi-location | 5×3 | 25 | 15 | ~$0.47 |

Google Sheet creation is free (handled by the Rube/Composio integration).

Run `--estimate-only` first to confirm the Apify cost before launching.

Track usage: https://console.apify.com/billing

## Setup

### 1. Apify API Token

```bash
# Get your token at https://console.apify.com/account/integrations
export APIFY_API_TOKEN="apify_api_YOUR_TOKEN_HERE"
```

### 2. Install dependencies

```bash
pip3 install requests
```

### 3. Rube/Composio (for Google Sheets)

Google Sheet creation runs through Rube MCP plus Composio. The token is pre-set.
If it breaks, refresh the `RUBE_TOKEN` env var or the default in `search_jobs.py`.

## Usage

### Step 1: Define your ICP and target titles

Frame it this way: **"If a company is hiring for [role], they're investing in [problem area you solve]."**

Examples:
- GTM agency: "Growth Marketing Manager", "SDR Manager", "RevOps Engineer", "GTM Engineer"
- AI dev tools: "AI Engineer", "ML Ops Engineer", "Prompt Engineer", "LLM Engineer"
- Sales automation: "SDR", "BDR Manager", "Sales Ops", "Revenue Operations"

### Step 2: Estimate cost

```bash
python3 $HOME/skills/moves/job-posting-intent/scripts/search_jobs.py \
  --titles "GTM Engineer,SDR Manager,Head of Demand Gen" \
  --locations "United States" \
  --max-per-title 25 \
  --estimate-only
```

### Step 3: Run the search

The script queries LinkedIn Jobs, groups results by company, qualifies leads, and creates a Google Sheet automatically.

```bash
# Standard search (creates Google Sheet)
python3 $HOME/skills/moves/job-posting-intent/scripts/search_jobs.py \
  --titles "GTM Engineer,SDR Manager,RevOps Engineer" \
  --locations "United States" \
  --max-per-title 25

# Deep search with a custom sheet name
python3 $HOME/skills/moves/job-posting-intent/scripts/search_jobs.py \
  --titles "AI Engineer,ML Ops Engineer,Prompt Engineer" \
  --locations "United States" \
  --max-per-title 50 \
  --sheet-name "AI Hiring Signals - Feb 2026"

# Filter results to only truly relevant titles (LinkedIn search is fuzzy)
python3 $HOME/skills/moves/job-posting-intent/scripts/search_jobs.py \
  --titles "GTM Engineer,Growth Marketing Manager,SDR Manager" \
  --locations "United States" \
  --relevance-keywords "gtm,growth,sdr,marketing,demand gen,revops"

# Also save raw JSON alongside the sheet
python3 $HOME/skills/moves/job-posting-intent/scripts/search_jobs.py \
  --titles "GTM Engineer,SDR Manager" \
  --locations "United States" \
  --output results.json

# Skip Google Sheet — console + JSON only
python3 $HOME/skills/moves/job-posting-intent/scripts/search_jobs.py \
  --titles "GTM Engineer" \
  --no-sheet --json
```

## What the Script Does

1. **Searches** LinkedIn Jobs for each title/location combination via Apify
2. **Groups** the results by company (deduplicates them)
3. **Computes signal strength** using relevant posting count + seniority
4. **Extracts personalization context** from the job descriptions (tech stack, growth signals, pain points)
5. **Suggests a decision-maker title** (one level above the role being hired)
6. **Suggests an outreach angle** (accelerate / replace / multiply the hire)
7. **Creates a Google Sheet** for every qualified lead
8. **Prints a console summary** of every company found

## Options Reference

```
Required:
  --titles              Comma-separated job titles to search

Optional:
  --locations           Comma-separated locations (default: no filter)
  --max-per-title       Max jobs per title per location (default: 25)
  --posted-limit        Recency: 1h, 24h, week, month (default: week)
  --output, -o          Also save raw JSON to this file path
  --json                Print JSON output to console
  --estimate-only       Show cost estimate without running
  --no-sheet            Skip Google Sheet creation
  --sheet-name          Custom Google Sheet title (default: "Job Posting Intent Signals - {date}")
  --relevance-keywords  Comma-separated keywords to filter genuinely relevant postings
```

## Google Sheet Columns

| Column | Description |
|--------|-------------|
| Signal | HIGH / MEDIUM / LOW based on posting count + seniority |
| Company | Company name |
| Employees | Employee count |
| Industry | Company industry |
| Website | Company website |
| LinkedIn | Company LinkedIn URL |
| # Postings | Count of relevant job postings found |
| Job Titles | The actual job titles that surfaced |
| Job URL | Link to the lead job posting |
| Location | Job location(s) |
| Decision Maker | Suggested title of the person to contact |
| Outreach Angle | Accelerate / Replace / Multiply the hire |
| Tech Stack | Technologies mentioned in job descriptions |
| Growth Signals | Growth indicators (first hire, scaling, funding stage) |
| Pain Points | Pain indicators (automate, optimize, manual processes) |
| Description | Company description snippet |

## AI Agent Integration

When using this skill as an agent, the standard flow is:

1. User describes their product and the role types that signal intent
2. Agent runs `--estimate-only` and confirms cost with the user
3. Agent runs the search (Google Sheet is created automatically)
4. Agent shares the Google Sheet link
5. Agent gives a brief rundown of the top leads and why they qualify

**Example prompt:**
> "Find companies hiring growth marketers and SDRs in the US this week. These are signals they need GTM help. We sell AI-powered GTM systems to Series A-C B2B SaaS companies with 20-200 employees."

The agent SHOULD NOT:
- Run any outreach
- Send any emails or messages
- Contact anyone

The agent SHOULD:
- Show the cost estimate before launching
- Run the search (the sheet is created automatically)
- Share the Google Sheet link
- Provide a brief overview of the top leads with reasoning

## Outreach Angle Templates

The script auto-tags an angle based on context from the job posting:

**"Accelerate while you hire"** — Best when: posting is recent, role is junior/mid
> They're looking for someone to do X. Your product can deliver X outcomes while they ramp the hire.

**"Replace the hire"** — Best when: small company, "first hire" signals, building from scratch
> They want the output of a [role] but may not need a full-time person if they use your product.

**"Multiply the hire"** — Best when: the company is clearly scaling with several related roles
> When their new hire starts, your product makes them 10x more effective from day one.

## Troubleshooting

### "No jobs found"
- Try broader titles (e.g., "marketing" instead of "demand generation specialist")
- Stretch the time window: `--posted-limit month`
- Drop the location filter to search globally

### "Too many irrelevant results"
- Apply `--relevance-keywords` to filter by title keywords
- LinkedIn's search is fuzzy — the grouping and qualification step helps remove noise

### "Google Sheet creation failed"
- Confirm Rube MCP is reachable (the token may have lapsed)
- Use `--no-sheet --json --output results.json` to save results without a sheet
- You can create the sheet later via `scripts/create_sheet_mcp.py`

### High cost estimate
- Reduce `--max-per-title` (25 is normally enough)
- Search fewer titles
- Use `--posted-limit 24h` for a quick daily scan

## Links

- [Apify LinkedIn Job Search Actor](https://apify.com/harvestapi/linkedin-job-search)
- [Apify API Token](https://console.apify.com/account/integrations)
- [Apify Billing Dashboard](https://console.apify.com/billing)
