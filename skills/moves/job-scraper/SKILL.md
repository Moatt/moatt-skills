---
name: job-scraper
description: >
  Search job postings across LinkedIn and Indeed. Reach for this when users
  want to surface open roles, monitor hiring signals, identify companies
  hiring for specific positions, or research competitor hiring patterns.
  Returns job title, company, location, salary, description, seniority level,
  and direct apply URLs. No login or cookies required.
tags: [lead-generation, research]
---

# Job Scraper

Searches job postings across LinkedIn and Indeed via Apify. Find open roles by keyword, location, company, or job type. Use for hiring signal detection, GTM research, or competitive intelligence.

No LinkedIn cookies. No Indeed login. Search queries go in, structured job data comes out.

## When to Auto-Load

Load this skill when:
- User says "find jobs", "who is hiring", "what roles is [company] hiring for"
- User wants hiring signals ("find companies growing their AI team")
- User wants competitive intelligence ("what is [competitor] hiring for")
- User says "job search", "open roles", "job listings", "job postings"

## Prerequisites

### Apify API Token

Required for both LinkedIn and Indeed scraping. Set in `.env`:

```
APIFY_API_TOKEN=your_token_here
```

No LinkedIn cookies, Indeed login, or any platform credentials needed. That's the entire setup.

---

## Sources

This skill queries two job platforms via Apify actors:

| Source | Apify Actor | Best For | Cost |
|--------|------------|----------|------|
| **LinkedIn** | `automation-lab/linkedin-jobs-scraper` | B2B, tech, SaaS, enterprise roles. Carries seniority level, job function, industries. | ~$0.002/job |
| **Indeed** | `borderline/indeed-scraper` | Broadest coverage. Richest data — salary, company details, ratings, contacts, street addresses. | ~$0.004/job |

### Source Selection Logic

**Do NOT ask the user which source to use unless it's genuinely ambiguous.** Decide from context:

1. **User specifies a source** → use that source only.
2. **Context strongly suggests one source:**
   - B2B/tech/SaaS roles, enterprise companies, seniority-level filtering → **LinkedIn**
   - Hourly/blue-collar roles, local/retail jobs, salary-focused search → **Indeed**
   - Company hiring research ("what is Stripe hiring for") → **LinkedIn** (better company filtering)
3. **No clear signal** → query **both sources**, deduplicate by job title + company name, present the combined results.

Once you've decided, **tell the user which source(s) you're searching and why.** Don't ask — inform.

---

## Workflow

### Phase 0: Understand the Request

Pull from the user's message:
- **Search term** — job title, role, or keyword (required)
- **Location** — city, state, country, or "Remote" (optional)
- **Company** — specific company name (optional)
- **Recency** — "recent", "last week", "last 30 days" (optional)
- **Job type** — fulltime, parttime, contract, internship (optional)
- **Remote** — whether to filter for remote jobs (optional)
- **Result count** — how many results they want (default: 25)

If anything is ambiguous, pick sensible defaults and tell the user what you chose. Don't ask clarifying questions for things you can reasonably infer.

### Phase 1: Search

#### LinkedIn — `automation-lab/linkedin-jobs-scraper`

**API call:**
```bash
curl -X POST "$MOATT_API_BASE/v1/proxy/apify/acts/automation-lab~linkedin-jobs-scraper/runs" \
  -H "Authorization: Bearer $MOATT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "searchQuery": "AI engineer",
    "location": "San Francisco",
    "maxItems": 25
  }'
```

**Input fields:**
| Field | Type | Description |
|-------|------|-------------|
| `searchQuery` | string | Job title or keywords (required) |
| `location` | string | City, state, or country (optional) |
| `maxItems` | integer | Max jobs to return (default: 50) |

**Polling for results:**
```bash
# Check run status (poll every 10s)
curl -s -H "Authorization: Bearer $MOATT_API_KEY" "$MOATT_API_BASE/v1/proxy/apify/acts/automation-lab~linkedin-jobs-scraper/runs/{RUN_ID}"
# Once status is SUCCEEDED, fetch results
curl -s -H "Authorization: Bearer $MOATT_API_KEY" "$MOATT_API_BASE/v1/proxy/apify/datasets/{DATASET_ID}/items"
```

**Output fields per job:**
- `title` — Job title
- `companyName` — Company name
- `companyLinkedinUrl` — Company LinkedIn page
- `companyLogo` — Logo URL
- `location` — City, state
- `salary` — Salary text (when available)
- `employmentType` — Full-time, Part-time, Contract, etc.
- `seniorityLevel` — Entry, Mid-Senior, Director, Executive, etc.
- `jobFunction` — Engineering, Sales, Marketing, etc.
- `industries` — Industry classification
- `descriptionText` — Full job description (plain text)
- `descriptionHtml` — Full job description (HTML)
- `applicantsCount` — Number of applicants
- `postedAt` — When posted (e.g., "6 days ago")
- `url` — Direct link to the LinkedIn job posting
- `applyUrl` — Direct apply URL

#### Indeed — `borderline/indeed-scraper`

**API call:**
```bash
curl -X POST "$MOATT_API_BASE/v1/proxy/apify/acts/borderline~indeed-scraper/runs" \
  -H "Authorization: Bearer $MOATT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "AI engineer",
    "location": "San Francisco, CA",
    "country": "us",
    "maxResults": 25
  }'
```

**Input fields:**
| Field | Type | Description |
|-------|------|-------------|
| `query` | string | Job title or keywords (required) |
| `location` | string | City and state (optional) |
| `country` | string | Lowercase 2-letter country code (required). Common: `us`, `uk`, `ca`, `de`, `fr`, `in`, `au` |
| `maxResults` | integer | Max jobs to return |

**Important:** The `country` field is required for Indeed. If the user doesn't specify a country, default to `us`. Use lowercase 2-letter codes only.

**Output fields per job:**
- `title` — Job title
- `companyName` — Company name
- `companyDescription` — Company description
- `companyNumEmployees` — Company size
- `companyRevenue` — Company revenue range
- `companyUrl` — Company Indeed page
- `location` — Object with `city`, `postalCode`, `country`, `formattedAddressShort`, `latitude`, `longitude`, `streetAddress`
- `salary` — Object with `salaryCurrency`, `salaryMin`, `salaryMax`, `salaryText`, `salaryType` (hourly/yearly)
- `descriptionText` — Full job description (plain text)
- `descriptionHtml` — Full job description (HTML)
- `datePublished` — Posted date (YYYY-MM-DD)
- `age` — Human-readable age ("24 days ago")
- `expired` — Whether the job is still active
- `isRemote` — Remote flag
- `jobType` — Employment type
- `jobUrl` — Direct Indeed job URL
- `applyUrl` — Direct apply URL
- `rating` — Company rating and review count
- `emails` — Contact emails (when available)
- `attributes` — Job attributes list (benefits, requirements, etc.)
- `hiringDemand` — Urgent hire / high volume hiring flags

### Phase 2: Filter & Deduplicate

#### Recency Filtering

If the user asked for recent jobs, filter results by date:
- **LinkedIn:** Use the `postedAt` field (e.g., "6 days ago") — parse the text for recency.
- **Indeed:** Use the `datePublished` field (YYYY-MM-DD) — compare against today's date.

Drop jobs older than what the user requested. If no recency filter was specified, still drop jobs older than 30 days by default to avoid stale data.

#### Deduplication (when using both sources)

When searching both LinkedIn and Indeed, the same job often shows up on both. Deduplicate by:
1. Normalizing company name (lowercase, strip "Inc", "LLC", "Corp", etc.)
2. Normalizing job title (lowercase)
3. If company name AND job title match, keep the entry with richer data (prefer Indeed for salary data, LinkedIn for seniority level)

### Phase 3: Present Results

Display results as a summary table:

```
Source: LinkedIn + Indeed (deduplicated)
Jobs found: {count}
Location: {location}
Search: "{query}"

| # | Title | Company | Location | Salary | Posted | Source |
|---|-------|---------|----------|--------|--------|--------|
| 1 | AI Engineer | Stripe | SF, CA | $200K-$300K | 3 days ago | LinkedIn |
| 2 | ML Engineer | Meta | Menlo Park, CA | $58.65/hr | Mar 14 | Indeed |
| ... |
```

Below the table:
- Note how many were filtered for recency
- Note how many duplicates were dropped
- Show the total cost of the search

If the user wants more detail on a specific job, surface the full description.

### Phase 4: Export (Optional)

If the user wants to save results:

```
{search-term}-jobs-{YYYY-MM-DD}.csv
```

CSV columns:
```
title, company, location, salary, employment_type, seniority_level, posted_date, job_url, apply_url, description, source
```

Normalize fields across sources so the CSV ends up with a consistent schema no matter where each job came from.

---

## Cost Estimates

| Search | LinkedIn Only | Indeed Only | Both Sources |
|--------|-------------|------------|-------------|
| 25 jobs | ~$0.05 | ~$0.10 | ~$0.15 |
| 50 jobs | ~$0.10 | ~$0.20 | ~$0.30 |
| 100 jobs | ~$0.20 | ~$0.40 | ~$0.60 |

LinkedIn is cheaper per job. Indeed returns richer data per job. Both together produce the most complete picture.

---

## Common Use Cases

**Hiring signal detection:**
"Find companies hiring AI engineers in SF" → Query both sources, group by company, rank by number of open roles. Companies with 5+ AI roles are actively building.

**Competitive intelligence:**
"What is Anthropic hiring for?" → Search LinkedIn with `searchQuery: "Anthropic"`. Shows their open roles, team growth, and strategic priorities.

**Salary research:**
"What do ML engineers make in NYC?" → Search Indeed (richer salary data). Filter to NYC, aggregate salary ranges.

**GTM prospecting:**
"Find companies hiring for VP of Sales" → These companies are scaling their sales org and might need sales tools. Export the company list for outreach.

---

## Error Handling

| Error | Fix |
|-------|-----|
| `APIFY_API_TOKEN` not set | Ask the user to add it to `.env` |
| Indeed: `Missing country input` | Add the `country` field with a lowercase 2-letter code (default: `us`) |
| LinkedIn: 0 results | Broaden the search query or drop the location filter |
| Indeed: 999 results returned | The `maxResults` field may not cap results. Filter client-side. |
| Apify run fails or times out | Retry once. If still failing, try the other source. |
| Stale results (30+ days old) | Apply a recency filter. Warn the user about data freshness. |
