---
name: uspto-patent-monitor
description: >
  Monitor USPTO patent filings and grants for a specified company list,
  classifying each filing by technology category and surfacing R&D
  direction signals — what the company is investing in, what they're
  hiding, and where a vendor or competitor might intersect. Free,
  no API key required. Useful for competitive intel, R&D-aware
  outbound, and sales to deep-tech buyers.
tags: [research, competitive-intel]
---

# USPTO Patent Monitor

A company's patent activity is one of the most direct signals of where they're investing R&D. Filings reveal what they're building 18-24 months before launch, who's leading the work, and what categories the company sees as defensible. The USPTO data is fully public and free to query.

**Built for:** Competitive intel teams tracking deep-tech competitors, ABM teams selling to R&D-led organizations, and anyone working an account where what the company *is building* is more important than what they're currently shipping.

## When to Use

- "Watch USPTO patents for {Company}"
- "Surface recent patent filings by our top competitors"
- "What are {Industry} leaders patenting right now?"
- "Run the patent scan on the {Vertical} watchlist"

## What Patent Activity Reveals

A single filing tells you:
- **What they're building** — the abstract describes the invention
- **Who's building it** — inventors are named (often the engineers/scientists worth tracking on LinkedIn)
- **When the work started** — filing dates predate launches by 18-24 months on average
- **What they think is defensible** — the claims section reveals what they consider novel and worth protecting
- **What they're worried about** — the cited prior art reveals which competitors / publications they're benchmarking

A pattern over time tells you:
- **Strategic direction** — categories where filings accelerate
- **Categories abandoned** — areas with no recent activity
- **Engineering team posture** — same names recurring vs. revolving inventors
- **Acquisition targets** — patents licensed FROM other companies (revealed in assignment records)

## Data Sources

USPTO offers multiple free APIs and data sources:

| Source | What it has | Latency |
|---|---|---|
| **PatentsView API** (`https://api.patentsview.org/`) | Best-structured, normalized data; full-text for granted patents | Granted patents (lag ~1-3 months from filing) |
| **PatFT** (`https://patft.uspto.gov/`) | Granted patents full-text search | Same as above |
| **AppFT** (`https://appft.uspto.gov/`) | Published applications full-text (18 months after filing) | Published applications |
| **Patent Public Search** (`https://ppubs.uspto.gov/`) | Modern web UI; supports advanced queries | Most current |
| **Bulk data** (`https://bulkdata.uspto.gov/`) | Weekly bulk dumps | Volume-grade |
| **Assignment Search** (`https://assignment.uspto.gov/`) | Ownership transfers (when company A buys patents from company B) | Real-time |

**Default for this skill:** PatentsView for structured queries, PatFT/AppFT as fallback for full-text needs.

PatentsView requires no API key but expects a User-Agent and respects ~45 requests per minute.

## Inputs

Required:
- **Watchlist** — companies to monitor. Each entry: company name + variants. The skill resolves name → assignee identifier.

Optional:
- **CPC / IPC class filter** — Cooperative Patent Classification or International Patent Classification codes. Use to narrow to specific tech areas (e.g., `G06N` for AI/neural nets, `G06F` for computing, `H04L` for networking).
- **Inventor watchlist** — track specific named inventors (former colleagues, key engineers known to lead future products).
- **Cadence** — `daily` / `weekly` / `monthly`. Default: `weekly`.
- **Filing types** — `[applications, granted, both]`. Default: `both`.
- **Lookback window** — how far back to scan on first run. Default: 18 months.

## Workflow

### Step 1 — Resolve company → assignee

PatentsView and the USPTO use "assignee" as the company identifier. Company names vary in filings (Apple Inc., Apple Computer Inc., Apple Computer, Inc., etc.). On first run:

1. Query PatentsView assignees endpoint for each watchlist company name
2. Match candidates by name similarity + recent filing volume
3. Aggregate matched assignee IDs (a company often has multiple due to subsidiaries and historical name changes)
4. Cache the mapping; flag any low-confidence matches for human review

### Step 2 — Query recent filings

For each assignee, query for filings since `last_scan` (or `lookback_window` on first run):

```
GET https://api.patentsview.org/patents/query
?q={"assignee_id": "{id}", "patent_date": {"_gte": "{since-date}"}}
&f=["patent_number", "patent_title", "patent_abstract", "patent_date", 
    "inventors", "cpc_subgroup_id", "patent_kind"]
```

Pull both granted patents and published applications. (Granted patents can take 2-3 years from filing to grant; applications publish ~18 months after filing.)

### Step 3 — Classify and summarize per filing

For each filing:

1. **Extract** title, abstract, claims summary (top 3 claims), inventors, CPC codes, application date, grant date if applicable
2. **Classify** the technology category from CPC codes + abstract via a lookup table. Common high-signal categories:
   - `G06N` — AI / machine learning
   - `G06F` — Computing infrastructure
   - `H04L` — Networking / data transmission
   - `G06Q` — Business methods / commerce
   - `H04W` — Wireless / mobile
   - `G16H` — Healthcare informatics
   - `B60W` — Vehicle automation
3. **Summarize** in 1-3 sentences what's claimed, in plain English. Strip patent-attorney legalese.
4. **Flag** if any inventor is on the inventor watchlist
5. **Flag** if the filing is significantly different in category from the company's recent norm (signals new strategic direction)

### Step 4 — Detect patterns

Beyond per-filing summaries, the skill tracks patterns over time:

#### Direction shifts
- "Acme has filed 12 ML-related patents in the last 90 days, vs. 2 in the prior 90 days. Strategic acceleration in AI."

#### New inventor clusters
- "Three new inventors appeared on Acme's filings this quarter, all from {recently-acquired company}. The acquisition is now showing up in IP."

#### Categories abandoned
- "Acme has stopped filing in {category} after 3 years of activity. They've either solved it or moved on."

#### Assignment events
- Patents transferred IN: Acme acquired patents from {other company} on {date}.
- Patents transferred OUT: Acme licensed patents to {company} (or sold) — revenue event or strategic divestiture.

### Step 5 — Output

```markdown
## USPTO Patent Scan — {date}

**Watchlist:** {N} companies
**New filings:** {M} ({granted} granted + {applications} published applications)
**Direction-shift flags:** {K}
**Inventor-watch hits:** {J}

---

### {Company name}: {N} new filings since {last_scan}

#### Direction signals
- {Direction summary if any pattern detected}

#### Notable filings

##### Patent #{number}: "{Title}"
- **Filed:** {date} | **Granted:** {date | "pending"}
- **Category:** {primary CPC class + plain-English label}
- **Inventors:** {names; flag if on watchlist}
- **Plain summary:** {1-3 sentences}
- **Why it matters:** {one line — e.g., "First filing in autonomous-systems category; suggests pivot from advisory products to autonomy"}
- **Source:** [USPTO link]

##### {Next filing}...

#### Inventor watchlist hits
- {Inventor name} appeared on {N} filings this period; current company: {Acme}.

---

### Cross-watchlist patterns
- {Industry-wide observation if multiple companies show similar shifts}

### Output files
- `uspto-scan-{date}.md` — this report
- `uspto-scan-{date}.csv` — flat per-filing data
- `uspto-direction-history.json` — rolling category counts per company over time
```

### Step 6 — Cross-skill triggers

Hand-offs to other skills:

- **Direction shift detected** → trigger `competitor-research` refresh on that company
- **Inventor watchlist hit** → check LinkedIn for that person via `linkedin-profile-post-scraper`; potential outreach signal
- **Patent assignment IN** → cross-reference with `signal-scanner` M&A signals for confirmation/deeper context
- **Acquired tech competitor** → if patents map to competitor product area, flag for competitive deck refresh

## Patent Scoring (Optional)

For high-volume watchlists, score filings to surface the few worth deep-reading:

| Factor | Weight |
|---|---|
| Brand-new CPC class for that company | +30 |
| Inventor on watchlist | +25 |
| Multiple inventors (engineering team filing, not legal placeholder) | +15 |
| Granted (not just published) | +10 |
| Cited recent prior art | +10 |
| Continuation of an existing family (incremental, less signal) | -15 |
| Defensive filing (broad claims around something they're already shipping) | -10 |

Score >50: read the abstract, consider competitive deck update.
Score 25-50: note in scan, monitor for follow-on filings.
Score <25: roll up into the count, skip detailed read.

## Edge Cases

- **Privately-held companies** — most file patents under the company name; resolution works the same. The exception is companies that file via individual inventors (small startups) — these may show up as inventor-only filings without a clear assignee. Cross-reference inventor LinkedIn to attribute.
- **Stealth-mode startups** — won't show up in USPTO until 18 months post-filing. The skill can't detect what isn't published. Flag this as a known limitation.
- **Foreign filings** — companies often file in EPO (European Patent Office), JPO (Japan), CIPO (China) too. USPTO only covers US. For non-US-only deep monitoring, layer in EPO via Espacenet (also free).
- **Patent troll noise** — non-practicing entities (NPEs) hold large portfolios that produce noise. Maintain an NPE blocklist if scanning broad categories.

## Cost

| Component | Cost |
|---|---|
| PatentsView API | Free (rate-limited to ~45 req/min) |
| Per-filing summarization (LLM) | ~$0.002 |
| Pattern analysis (LLM) | ~$0.005 per company per scan |
| **Per scan, 50-company watchlist, weekly** | **~$1-3** |

## Tools Required

- HTTP client with rate limiting
- LLM for plain-English summarization and pattern detection
- Optional: Redis for assignee-ID cache + scan state
- Optional: PDF parsing if pulling full filing text from PatFT (PatentsView has structured fields, so usually unnecessary)

## Trigger Phrases

- "Watch USPTO patents for {Company}"
- "Surface recent patents by competitors"
- "Run the patent scan"
- "What's {Company} patenting?"
