---
name: pain-language-engagers
description: >
  Surface warm leads by mining LinkedIn for pain-language posts — the frustrations,
  complaints, and operational struggles your ICP openly discusses. Asks clarifying
  questions about your product, ICP, and their pain points, then generates pain-language
  search keywords, scrapes LinkedIn for posts and engagers, enriches profiles, and
  filters the results against ICP. Use when someone wants to "find leads who are
  complaining about X" or "find people discussing problems we solve" or run
  "LinkedIn pain-based prospecting."
tags: [lead-generation]
---

# Pain-Language Engagers

## Setup

Pull credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json is missing, tell the user to run: `npx moatt login`

Every endpoint uses Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`

Find warm leads by scraping LinkedIn for pain-language posts and the people who engage with them. Anyone who writes about, reacts to, or comments on a post describing an operational frustration is broadcasting that they live with a problem your product solves. This skill converts those signals into a qualified lead list.

**Core principle:** Search for **pain-language**, not solution-language. Solution keywords ("AI automation", "workflow optimization") attract builders and VCs. Pain keywords ("can't find drivers", "check calls are killing us") attract operators living with the problem.

## Phase 0: Intake

Before generating keywords or running anything, ask the user the questions below. Present them as a numbered list and tell the user to answer what's relevant and skip what isn't.

### Product & Pain Context

1. What does your product/service do in one sentence?
2. What specific problem does it solve? Who feels this pain most acutely?
3. What does your ICP's day-to-day look like WITHOUT your product? (The frustrations, workarounds, manual processes)
4. What phrases would someone use when **complaining** about this problem on LinkedIn? (e.g., "check calls are killing us", "can't find drivers", "spending hours on manual data entry")

### ICP Definition

5. What industries/verticals are your target buyers in?
6. Which job titles or roles are your ideal buyers? (e.g., "VP Operations", "Broker owner", "Head of Logistics")
7. Which titles should be EXCLUDED? (e.g., "Software Engineer", "AI researcher")
8. Any specific competitors whose employees should be filtered out?
9. Geographic focus? (e.g., "United States only", "global")

### LinkedIn Signal Sources

10. Any LinkedIn company pages where your ICP tends to engage? (Industry publications, communities, competitor pages)
11. Any specific LinkedIn posts or content creators your ICP follows?

## Phase 1: Generate Pain-Language Keywords

From the intake answers, generate roughly 15-25 pain-language keywords in LinkedIn boolean search syntax. Organise into buckets:

- **Staffing/Resource Pain** — hiring difficulties, turnover, burnout
- **Operational Friction** — manual processes, missed SLAs, communication breakdowns
- **Margin/Growth Pain** — cost pressure, scaling challenges
- **Process Complaints** — specific workflow frustrations

**Key principle:** Every keyword should be something a frustrated operator would actually type or say — not marketing language or solution framing.

Also produce:
- **ICP keyword list** — industry terms used for ICP classification (from answer #5)
- **Tech vendor exclusion list** — competitor names + generic tech titles (from answers #7, #8)
- **Pain-pattern regexes** — for filtering company page posts (derived from the keywords)
- **Broad topic patterns** — industry terms for filtering known industry pages
- **Hardcoded company pages** — from answer #10, plus anything the agent suggests based on the industry

**Present the full keyword list to the user for approval/refinement before running.** This is the most critical step — bad keywords = bad leads.

Once approved, persist the complete config as JSON:

```bash
# Save config
skills/pain-language-engagers/configs/{client-name}.json
```

Config JSON structure:

```json
{
  "client_name": "example-client",
  "pain_keywords": ["\"can't find X\"", "\"hiring Y\" problems"],
  "pain_patterns": ["can.t find X", "hiring Y", "manual.*process"],
  "icp_keywords": ["industry-term-1", "industry-term-2"],
  "tech_vendor_keywords": ["software engineer", "competitor-name"],
  "hardcoded_companies": ["https://www.linkedin.com/company/example/"],
  "industry_pages": ["https://www.linkedin.com/company/example/"],
  "broad_topic_patterns": ["industry", "sector", "niche-term"],
  "country_filter": "United States",
  "days_back": 60,
  "max_posts_per_keyword": 50,
  "max_posts_per_company": 100
}
```

## Phase 2: Run LinkedIn Scraping Pipeline

Execute the pipeline script with the saved config:

```bash
python3 skills/pain-language-engagers/scripts/pain_language_engagers.py \
  --config skills/pain-language-engagers/configs/{client-name}.json \
  [--test] [--companies "url1,url2"]
```

**Flags:**
- `--config` (required) — path to the client config JSON
- `--test` — limit to 3 keywords and 5 posts per company (validation run)
- `--skip-discovery` — skip keyword search; only scrape hardcoded/extra companies
- `--companies "url1,url2"` — append extra company URLs to scrape

**What the script does:**

1. **Keyword search** — `apimaestro/linkedin-posts-search-scraper-no-cookies` runs per pain keyword
2. **Post author extraction** — Anyone who wrote a pain post is a direct lead (free, no API call)
3. **Company page discovery** — Pull company pages out of keyword results
4. **Company page engager scraping** — `harvestapi/linkedin-company-posts` runs per company page with a pain filter
5. **Profile enrichment** — `harvestapi/linkedin-profile-scraper` enriches every profile (headline + location)
6. **ICP classification** — Uses the client-specific ICP/vendor keyword lists from the config
7. **Dedup + CSV export**

**Cost estimate:**
- Keyword search: roughly $0.10 per keyword (~$2 across 20 keywords)
- Company page scraping: roughly $0.002 per post per company (~$0.20 per company)
- Profile enrichment: roughly $0.003 per profile
- Full run with 20 keywords + 10 companies: roughly $5-10

**Always run with `--test` first** to confirm the config produces relevant results before a full sweep.

## Phase 3: Review & Refine

Once the script finishes, surface the results to the user:

- **ICP breakdown** — counts per tier (Likely / Possible / Unknown / Tech Vendor)
- **Top 15 Likely ICP leads** — name, role, company, engagement type
- **Sample of filtered-out leads** — so the user can catch false negatives
- **Keyword performance** — which keywords drove the most leads, which were duds

If the user wants tweaks:
1. Update the config JSON (add/remove keywords, refine ICP lists)
2. Re-run the script
3. Iterate until the user is satisfied

Common tweaks:
- **Too many Tech Vendor results** — extend `tech_vendor_keywords` with more vendor names
- **Missing obvious ICP leads** — add more industry terms to `icp_keywords`
- **Irrelevant posts** — make `pain_patterns` more specific
- **Not enough results** — add more keywords or extend `days_back`

## Phase 4: Output

CSV exported to the current working directory as `{client-name}-{date}.csv` with columns:

| Column | Description |
|--------|-------------|
| Name | Full name |
| LinkedIn Profile URL | Profile link |
| Role | Parsed from the headline |
| Company Name | Parsed from the headline |
| Location | From profile enrichment |
| Source Page | The company page(s) they engaged on |
| Post URL(s) | Links to the post(s) they engaged with |
| Engagement Type | Post Author, Comment, or Reaction |
| Comment Text | Their comment (if applicable — personalization gold) |
| ICP Tier | Likely ICP, Possible ICP, Unknown, or Tech Vendor |
| Niche Keyword | Which pain keyword matched |

## Tools Required

- **Apify API token** — set as `APIFY_API_TOKEN` in `.env`
- **Apify actors used:**
  - `apimaestro/linkedin-posts-search-scraper-no-cookies` (keyword search)
  - `harvestapi/linkedin-company-posts` (company page scraping)
  - `harvestapi/linkedin-profile-scraper` (profile enrichment)

## Example Usage

**Trigger phrases:**
- "Find people complaining about [problem] on LinkedIn"
- "LinkedIn pain-based prospecting for [product]"
- "Find leads who are discussing [pain point]"
- "Scrape LinkedIn for [industry] pain posts"
- "Run the pain-language engagers pipeline for [client]"

**With an existing config:**
```bash
python3 skills/pain-language-engagers/scripts/pain_language_engagers.py \
  --config skills/pain-language-engagers/configs/happy-robot.json
```

**Test mode:**
```bash
python3 skills/pain-language-engagers/scripts/pain_language_engagers.py \
  --config skills/pain-language-engagers/configs/happy-robot.json --test
```
