---
name: apollo-lead-finder
description: >
  Apollo.io prospecting in two stages: a no-cost People Search that uncovers
  ICP-aligned prospects, followed by targeted enrichment to surface emails and
  phone numbers (consuming credits per contact). Builds Apollo lists and
  removes duplicates against your existing book by LinkedIn URL.
tags: [lead-generation]
---

# Apollo Lead Finder

## Setup

Pull credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

When ~/.moatt/credentials.json is missing, instruct the user to execute: `npx moatt login`

Every endpoint relies on Bearer authentication: `-H "Authorization: Bearer $MOATT_API_KEY"`

Apollo.io prospecting splits into two stages — a **free** People Search step that surfaces candidates, then a **paid** enrichment pass that exposes emails and phone numbers. The skill also handles Apollo list and contact creation.

**Why this matters:** Apollo's People Search burns zero credits. Credits are only deducted during the enrichment pass that uncovers email/phone details. So you can browse tens of thousands of records for free, evaluate them, and spend credits only on the prospects worth pursuing.

## Prerequisites

### Apollo API Key

Grab your API key under Apollo.io Settings > Integrations > API. Drop it into `.env`:
```
APOLLO_API_KEY=your-api-key-here
```

Just that one env var — nothing else.

## Phase 0: Intake

Ask the user the questions below to assemble the Apollo filter config:

### ICP Criteria

1. Which **job titles** are in scope? (e.g., "VP of Sales", "Head of Growth")
2. Which **seniority levels** apply? Choices: owner, founder, c_suite, partner, vp, director, manager, senior, entry
3. **Company size** by headcount? Format the range as "51,200" "201,500" "501,1000" "1001,5000"
4. **Geographic regions** to focus on? (e.g., "United States", "San Francisco, California")
5. **Industry/keyword tags** to match? (e.g., "SaaS", "Software", "FinTech")
6. Are there titles to **filter out**? (e.g., "intern", "assistant")
7. Should the workflow **build an Apollo list** for these contacts? (default: yes)
8. How many records do you want returned? (test: 100, standard: 5,000, full: 50,000)

### Map Answers to Config

Assemble the config JSON using Apollo's filter schema:

```json
{
  "client_name": "example-client",
  "search_config_name": "vp-sales-us-midmarket",
  "icp_segment": "sales-leaders",
  "apollo_filters": {
    "person_titles": ["VP of Sales", "Head of Sales", "Director of Sales"],
    "person_seniority": ["vp", "director"],
    "person_locations": ["United States"],
    "organization_num_employees_ranges": ["51,200", "201,500", "501,1000"],
    "q_organization_keyword_tags": ["SaaS", "Software"]
  },
  "enrichment_filters": {
    "exclude_titles_containing": ["intern", "assistant"]
  },
  "apollo_list_name_prefix": "example-sales-leaders",
  "create_apollo_list": true,
  "mode": "standard",
  "max_pages": 50
}
```

Apollo search filters available to you:
- `person_titles` — array of title keywords
- `person_seniority` — seniority bucket: owner, founder, c_suite, partner, vp, director, manager, senior, entry
- `person_locations` — array of location strings
- `organization_num_employees_ranges` — headcount bands using "min,max" format (e.g., "51,200")
- `q_organization_keyword_tags` — company keyword tags (e.g., "SaaS", "Software")
- `person_not_titles` — array of titles to drop
- `q_organization_name` — search by organization name
- `organization_locations` — HQ locations for the company

## Phase 1: Search (FREE)

### What the free search actually returns

The Apollo `api_search` endpoint hands back **preview data only**: Apollo person ID, first name, masked last name, title, employer, and the boolean flags has_email/has_phone. You will **not** see LinkedIn URLs, emails, or complete names — those require enrichment.

### Pipeline Steps

**Step 1: Assemble Apollo search payload** — Translate config filters into Apollo's People Search format.

**Step 2: Pull page 1** — Retrieve the first 100 entries plus `total_entries` to learn the full count.

**Step 3: Walk pages** — Fetch each subsequent page (100 records per page) up to the cap dictated by mode. Apply title filtering as you go.

**Step 4: Collect Apollo person IDs** — Persist the Apollo person IDs returned by search so the enrich phase can use them.

**Step 5: Show a preview** — Display a small sample (first name, title, company) along with the total count. Confirm with the user before enriching.

### Mode Caps

| Parameter | Test | Standard | Full |
|-----------|------|----------|------|
| Max pages | 1 | 50 | 500 |
| Max results | 100 | 5,000 | 50,000 |
| Search credits | 0 | 0 | 0 |

**Cost: FREE.** People Search burns no Apollo credits.

## Database Write Policy

**CRITICAL: Do not export leads without explicit user sign-off.**

Search is free. Enrichment burns credits.

**Mandatory flow:**
1. Execute search first (free) — examine the results
2. Show the user the search output: total matches, sample records, title breakdown
3. **Wait for explicit user approval** before triggering the enrich phase
4. After enrichment, display the enriched records to the user **prior to any export**
5. Export only once the user gives the green light

## Phase 2: Enrich (COSTS CREDITS)

Apply the Apollo Bulk People Match API to enrich the leads chosen in Phase 1.

### Pipeline Steps

**Step 1: Load search manifest** — Pull the manifest JSON written by the search phase. It holds the Apollo person IDs.

**Step 2: Load existing contacts for dedup** — If the user has a CSV of current contacts or a previous export, ingest the LinkedIn URLs for deduplication. Skip dedup if no baseline exists.

**Step 3: Confirm credits** — Print the lead count plus credit estimate. Pause for confirmation.

**Step 4: Bulk enrich** — POST to `/people/bulk_match` with batches of up to 10 Apollo person IDs. Each match = 1 credit. Returns the full payload: email, phone, LinkedIn URL, full name, location, and company details.

**Step 5: Dedup vs existing contacts** — Strip any leads whose LinkedIn URLs already live in the user's contact set.

**Step 6: Surface results to the user** — Show enriched samples (names, titles, companies, email coverage) and require explicit approval before writing to the database.

**Step 7: Export results** — **Only after the user signs off.** Save the enriched leads as CSV in the current working directory, or wherever the user requests.

### Mode Caps

| Parameter | Test | Standard | Full |
|-----------|------|----------|------|
| Max enrichments | 10 | 500 | 2,500 |
| Credits used | 10 | 500 | 2,500 |

**Cost: 1 credit per enriched contact.** Search first, examine results, then enrich the subset that matters.

## Phase 3: Review & Refine

Show results, including:
- **Total matching** — count of Apollo profiles that hit the filter set
- **New leads found** — net new entries after dedup
- **Apollo list** — list name and link to the Apollo UI
- **Enriched** — count of records that now have emails
- **Email coverage** — share of enriched leads with a valid email
- **Top 10 leads** — name, title, company snapshot

Typical tweaks:
- **Too broad** — add filters (seniority, headcount range, keyword tags)
- **Too narrow** — expand the title list or remove location constraints
- **Low email coverage** — some prospects simply have no known email; enriching more leads may help
- **Wrong ICP** — refine title include/exclude rules

## Example Usage

**Trigger phrases:**
- "Search Apollo for [titles] at [industries]"
- "Find leads in Apollo matching my ICP"
- "Find VP of Sales at SaaS companies in the US"
- "Enrich the Apollo leads from last search"

## Apollo API Reference

- **People Search:** `POST https://api.apollo.io/api/v1/mixed_people/api_search` — FREE, returns Apollo IDs plus preview fields (first name, title, org name, boolean flags). No LinkedIn URLs or emails.
- **People Match (enrich):** `POST https://api.apollo.io/api/v1/people/match` — 1 credit, returns email/phone
- **Bulk People Match:** `POST https://api.apollo.io/api/v1/people/bulk_match` — up to 10 records per request, 1 credit per record
- **Create List:** `POST https://api.apollo.io/api/v1/labels` — produces a named list
- **Create Contact:** `POST https://api.apollo.io/api/v1/contacts` — pushes a person into the Apollo CRM plus an optional list
- **Auth:** Every request carries `x-api-key: {APOLLO_API_KEY}` in the header
- **Rate limit:** Plan-dependent. Handle 429 responses using the Retry-After header.
- **Search Pagination:** Use the `page` parameter (1-indexed); `per_page` tops out at 100
