---
name: company-contact-finder
description: >
  Surface decision-makers at a named company by chaining Apollo, Crustdata, Fiber,
  and PDL people-search via the Moatt MCP. Provide a company plus the titles you
  care about; get back a deduplicated contact list with name, title, LinkedIn URL,
  and location.
tags: [lead-generation]
---

# company-contact-finder

Find the right humans at a specific company. The skill drives Moatt's MCP tools (Apollo, Crustdata, Fiber, PDL) through a tiered fallback so you exhaust the cheap providers before reaching for the expensive ones.

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| company_name | Yes | -- | Company to search (e.g., "EisnerAmper") |
| company_linkedin_url | No | -- | Company LinkedIn URL — helpful when the name is common |
| target_titles | Yes | -- | Titles to chase (e.g., ["Partner", "Controller", "VP Finance"]) |
| num_results | No | 10 | Cap on returned contacts |

## Procedure

### Step 1: Parse the Request

Extract from whatever the user said:
- **company_name** (required) — the target company
- **company_linkedin_url** (optional) — disambiguator for common names
- **target_titles** (required) — list of titles or roles (e.g., ["Partner", "Controller", "VP Finance", "CFO"])
- **num_results** (optional, default 10) — how many contacts to surface

If titles are missing, ask. Suggest sensible defaults given the context:
- Accounting/CPA firms: Partner, Managing Director, Controller, CFO, VP Finance
- Tech companies: VP Engineering, CTO, Head of Product, Director of Engineering
- General B2B: VP, Director, C-Level, Head of

### Step 2: Apollo Search (Primary — cheapest at $0.01/call)

Apollo is the lowest-cost option. Always start here.

**Call:**
```
apollo_person_search(
  person_titles: ["Partner", "Controller", "VP Finance"],
  organization_domains: ["eisneramper.com"],
  per_page: 25
)
```

No domain on hand? Fall back to `q_keywords` with the company name:
```
apollo_person_search(
  person_titles: ["Partner", "Controller", "VP Finance"],
  q_keywords: "EisnerAmper",
  per_page: 25
)
```

**Parse the response:**
Each hit returns name, title, company, LinkedIn URL, location, email, and other profile fields. Pull them all into a working list.

### Step 3: Evaluate Results

Count how many Step 2 results are real matches on both title and company.

**Quality checks:**
1. Drop results where the company doesn't match (fuzzy is fine — "EisnerAmper LLP" matches "EisnerAmper")
2. Drop results where the title doesn't plausibly hit any target title
3. Tally the survivors

**Decision:**
- 3+ quality matches: jump to Step 7 (Output)
- Below 3: continue to Step 4

### Step 4: Fiber Search (Fallback 1 — $0.02/record)

Fiber accepts natural-language queries and sometimes surfaces profiles Apollo misses.

**Call:**
```
fiber_person_search(
  query: "[title1] OR [title2] OR [title3] at [company_name]",
  page_size: 25
)
```

**After it returns:**
1. Parse results (name, title, company, LinkedIn URL, location)
2. Merge with the running list
3. Deduplicate by LinkedIn URL

**Decision:**
- 3+ unique matches in total: skip to Step 7
- Still under 3: continue to Step 5

### Step 5: Crustdata Structured Search (Fallback 2 — $0.66/page)

Crustdata's structured filters give you precise title and company matching. Run one query per target title and combine the results.

**For each target title, call:**
```
crustdata_person_search(
  conditions: [
    {"column": "current_employers.name", "type": "in", "value": "[company_name]"},
    {"column": "current_employers.title", "type": "(.)", "value": "[target_title]"}
  ],
  filter_op: "and",
  limit: 25
)
```

**Example for "Partner" at EisnerAmper:**
```
crustdata_person_search(
  conditions: [
    {"column": "current_employers.name", "type": "=", "value": "EisnerAmper"},
    {"column": "current_employers.title", "type": "(.)", "value": "Partner"}
  ],
  filter_op: "and",
  limit: 25
)
```

**Optional seniority filter:** When the user wants any senior decision-maker (rather than specific titles), add:
```
{"column": "current_employers.seniority_level", "type": "in", "value": "VP,C-Level,Director"}
```

**TIP:** Run `preview: true` first to confirm the count for free before paying for the full pull.

**After every title search has finished:**
1. Combine everything into one list
2. Deduplicate by LinkedIn URL (keep the first hit)
3. Merge with results from earlier steps

**Decision:**
- 3+ unique matches in total: jump to Step 7
- Still under 3: continue to Step 6

### Step 6: PDL Search (Fallback 3 — $0.30/record, most expensive)

PeopleDataLabs is the costliest option. Reach for it only when everything cheaper has come up short.

**Call:**
```
pdl_person_search(
  job_titles: ["Partner", "Controller", "VP Finance"],
  company_names: ["EisnerAmper"],
  num_results: 10
)
```

**After it returns:**
1. Parse results (name, title, company, LinkedIn URL, location)
2. Merge with the running list
3. Deduplicate by LinkedIn URL

### Step 7: Output

Present the final, deduplicated contact list.

**Table format (for the user):**

| # | Name | Title | Company | LinkedIn URL | Location |
|---|------|-------|---------|--------------|----------|
| 1 | Jane Smith | Partner | EisnerAmper | https://linkedin.com/in/janesmith | New York, NY |
| 2 | John Doe | Controller | EisnerAmper | https://linkedin.com/in/johndoe | Chicago, IL |
| ... | | | | | |

**JSON format (for downstream skills):**

```json
{
  "company": "EisnerAmper",
  "search_titles": ["Partner", "Controller", "VP Finance"],
  "contacts": [
    {
      "name": "Jane Smith",
      "title": "Partner",
      "company": "EisnerAmper",
      "linkedin_url": "https://linkedin.com/in/janesmith",
      "location": "New York, NY"
    }
  ],
  "total_found": 10,
  "sources": ["apollo", "fiber", "crustdata", "pdl"]
}
```

**Summary line:**
> Found X contacts matching [titles] at [company]. Sources used: [list of sources that returned results].

If fewer than 3 contacts surface across all fallbacks, surface this caveat:
> Only found X contacts. The company may be small, the titles may be uncommon, or the databases may have limited coverage here. Try broadening the title list or testing alternate company name spellings.

---

## Moatt MCP Tools Reference

### Cost Comparison (25 results)

| Provider | Cost | Tool |
|----------|------|------|
| Apollo | **$0.01** flat | `apollo_person_search` |
| Fiber | $0.50 | `fiber_person_search` |
| Crustdata | $0.66/page | `crustdata_person_search` |
| PDL | $7.50 | `pdl_person_search` |

Apollo first, always. Escalate to Fiber → Crustdata → PDL only when forced.

### Tool Details

| Tool | Purpose | Key Params |
|------|---------|------------|
| `apollo_person_search` | People search by title, location, company ($0.01/call) | `person_titles`, `person_locations`, `organization_domains`, `q_keywords`, `per_page` |
| `fiber_person_search` | NL or structured people search ($0.02/record) | `query` (NL), `search_params` (structured), `page_size` |
| `crustdata_person_search` | Structured filter search ($0.66/page of 100) | `conditions`, `filter_op`, `limit`, `preview` |
| `pdl_person_search` | PDL people search ($0.30/record — last resort) | `job_titles`, `company_names`, `location_country`, `num_results` |
| `fetch_linkedin_profile` | Enrich one person by LinkedIn URL | `linkedin_url` |

### Crustdata Filter Columns

| Column | Operators | Example Values |
|--------|-----------|----------------|
| `current_employers.name` | `=` (exact), `(.)` (contains) | `"EisnerAmper"` |
| `current_employers.title` | `(.)` (fuzzy), `=` (exact) | `"Partner"` |
| `current_employers.seniority_level` | `=`, `(.)` | `"VP"`, `"C-Level"` |
| `region` | `=` | `"San Francisco"` |
| `skills` | `(.)` | `"python"` |

---

## Examples

### Basic: Find Partners and Controllers at EisnerAmper
```
Find Partners and Controllers at EisnerAmper
```
Agent calls `apollo_person_search` with `person_titles: ["Partner", "Controller"], q_keywords: "EisnerAmper", per_page: 25`.

### With more titles: Find VP Finance and CFO at Sage Intacct users
```
Find VP Finance and CFO at companies using Sage Intacct
```
Agent builds the query `"VP Finance OR CFO at Sage Intacct"`.

### Senior leaders at a specific firm
```
Find Managing Directors at CPA firms in San Francisco
```
Agent builds the query `"Managing Director at CPA firm San Francisco"`.

### With a LinkedIn URL for disambiguation
```
Find Partners at EisnerAmper (https://linkedin.com/company/eisneramper)
```
Agent uses "EisnerAmper" as the company and reserves the LinkedIn URL for enrichment if needed.

---

## Troubleshooting

### MCP tools not available / connection errors

The Moatt MCP tools require a configured Moatt MCP server. If you hit "tool not found" or connection failures:

1. **Check MCP server config:** Confirm the Moatt MCP server is registered (in `claude_desktop_config.json` or the equivalent for your agent).
2. **Server URL:** The Moatt endpoint must be reachable. Check with the workspace admin for the correct host.
3. **Authentication:** Moatt may require an API key or auth token. Make sure credentials are loaded into the MCP server's settings.

### No results returned

- Try alternate spellings of the company ("EisnerAmper" vs "Eisner Amper" vs "EisnerAmper LLP")
- Broaden the title set (e.g., add "Managing Director" alongside "Partner")
- Switch to structured search (Step 4) with the fuzzy `(.)` operator
- Cascade through Fiber, Crustdata, then PDL (Steps 4-6) when single-source coverage is thin

### Too many irrelevant results

- Use sharper, more specific title terms
- Switch the structured query to `in` for exact title matching instead of fuzzy `(.)`
- Restrict by `seniority_level` to keep senior roles only

### Duplicate contacts across sources

Dedup happens on LinkedIn URL automatically. If you still see near-duplicates with trivially different URLs (trailing slashes, query strings), normalize the URLs — strip trailing slashes and query params — before the dedup pass.

---

## Metadata

```yaml
metadata:
  requires:
    mcp_servers: ["moatt"]
  cost: "From $0.01 (Apollo) to $7.50 (PDL) depending on provider and result count"
```
