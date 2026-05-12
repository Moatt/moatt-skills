---
name: linkedin-job-scraper
description: >
  Scrapes LinkedIn job postings via the JobSpy library (python-jobspy). Reach for this
  skill any time the user wants to find LinkedIn jobs, search for open roles, pull job
  listings, build a job pipeline, surface job targets for GTM research, or monitor hiring
  signals. Even if the user just says "find me some jobs" or "what roles is [company]
  hiring for", use this skill. It runs a local Python script that emits a CSV of job
  postings covering title, company, location, salary, job type, description, and direct
  URLs.
tags: [lead-generation]
---

# LinkedIn Scraper

## Overview

This skill locates LinkedIn job postings by running `tools/jobspy_scraper.py`, a slim wrapper
around the [JobSpy](https://github.com/speedyapply/JobSpy) library. It manages installation,
parameter construction, execution, and result interpretation.

## Quick Start

**Install the dependency once (Python 3.10+ required):**
```bash
python3.12 -m pip install -U python-jobspy --break-system-packages
```

**Run the scraper:**
```bash
python3.12 tools/jobspy_scraper.py \
  --search "software engineer" \
  --location "San Francisco, CA" \
  --results 25 \
  --output .tmp/jobs.csv
```

Results land as a CSV and are echoed as a summary table.

---

## Workflow

### Step 1 — Understand the request

Read out of the user's message:
- **Search term** — job title, role, or keyword (required)
- **Location** — city, state, or "Remote" (optional but advised)
- **Results wanted** — fall back to 25 when unspecified
- **Recency** — `hours_old` filter when the user wants fresh posts (e.g. "last 48 hours")
- **Company filter** — `linkedin_company_ids` when targeting a specific company
- **Full descriptions** — flip on `--fetch-descriptions` when the user needs job description text

When anything is ambiguous (e.g. "find AI jobs"), pick reasonable defaults and report what you chose.

### Step 2 — Construct the command

Assemble the `tools/jobspy_scraper.py` command with the parameters below.
Always write output under `.tmp/` so it's disposable and easy to locate.

```bash
python tools/jobspy_scraper.py \
  --search "<term>" \
  --location "<location>" \
  --results <N> \
  [--hours-old <N>] \
  [--fetch-descriptions] \
  [--company-ids <id1,id2>] \
  [--job-type fulltime|parttime|contract|internship] \
  [--remote] \
  --output .tmp/<descriptive_filename>.csv
```

**Note:** `--hours-old` and `--easy-apply` are mutually exclusive (LinkedIn API constraint).

### Step 3 — Run the script

Execute the command. The script prints a progress message and a summary of any results found.

If the script is missing at `tools/jobspy_scraper.py`, check whether it needs to be created
by reading `skills/linkedin-job-scraper/scripts/jobspy_scraper.py` and copying it into `tools/`.

### Step 4 — Interpret and present results

After the run:
- Report how many jobs landed
- Show a quick table: Title | Company | Location | Salary | Posted
- Note the output file path so the user can open it
- If zero results: suggest broadening the search term or dropping the location filter

---

## Parameters Reference

| Flag | Description | Default |
|------|-------------|---------|
| `--search` | Job title / keywords | required |
| `--location` | City, state, or country | none |
| `--results` | Number of results to fetch | 25 |
| `--hours-old` | Only jobs posted within N hours | none |
| `--fetch-descriptions` | Pull full job descriptions (slower) | false |
| `--company-ids` | Comma-separated LinkedIn company IDs | none |
| `--job-type` | fulltime, parttime, contract, internship | any |
| `--remote` | Limit to remote jobs only | false |
| `--output` | Path for CSV output | .tmp/jobs.csv |

---

## Output Columns

The CSV output contains:

| Column | Description |
|--------|-------------|
| `TITLE` | Job title |
| `COMPANY` | Employer name |
| `LOCATION` | City / State / Country |
| `IS_REMOTE` | True/False |
| `JOB_TYPE` | fulltime, contract, etc. |
| `DATE_POSTED` | When the listing was posted |
| `MIN_AMOUNT` | Minimum salary |
| `MAX_AMOUNT` | Maximum salary |
| `CURRENCY` | Currency code |
| `JOB_URL` | Direct link to the LinkedIn posting |
| `DESCRIPTION` | Full job description (when --fetch-descriptions is used) |
| `JOB_LEVEL` | Seniority level (LinkedIn-specific) |
| `COMPANY_INDUSTRY` | Industry classification |

---

## Common Use Cases

**Find recent engineering roles at a startup:**
```bash
python tools/jobspy_scraper.py --search "growth engineer" --location "New York" \
  --results 50 --hours-old 72 --output .tmp/growth_eng_nyc.csv
```

**Monitor what a specific company is hiring for:**
```bash
# First grab the LinkedIn company ID from the company's LinkedIn URL
python tools/jobspy_scraper.py --search "engineer" --company-ids 1234567 \
  --results 100 --fetch-descriptions --output .tmp/company_hiring.csv
```

**Find remote contract roles:**
```bash
python tools/jobspy_scraper.py --search "data analyst" --remote \
  --job-type contract --results 30 --output .tmp/remote_contracts.csv
```

---

## Error Handling

| Error | Fix |
|-------|-----|
| `ModuleNotFoundError: jobspy` | Run `pip install -U python-jobspy` |
| Zero results returned | Broaden the search term, drop the location, increase `--results` |
| Rate limited / blocked | Pause for a few minutes; avoid running back-to-back large scrapes |
| `hours_old and easy_apply cannot both be set` | Drop one of the two flags |

---

## Script Location

The scraper script lives at `tools/jobspy_scraper.py`.

If it's missing, copy it from `skills/linkedin-scraper/scripts/jobspy_scraper.py` into `tools/`:
```bash
cp skills/linkedin-job-scraper/scripts/jobspy_scraper.py tools/
```
