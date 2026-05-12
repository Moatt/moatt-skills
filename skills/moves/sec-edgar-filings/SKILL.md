---
name: sec-edgar-filings
description: >
  Monitor SEC EDGAR for material filings (8-K, S-1, 10-Q, 10-K, 13F,
  proxy statements) on a specified company list. Surfaces material
  events — leadership changes, M&A, capital raises, lawsuits, executive
  compensation disclosures — within hours of filing. Free, no API key
  required. Lookup by ticker or CIK; recurring scan or one-shot.
tags: [research, competitive-intel]
---

# SEC EDGAR Filings Monitor

EDGAR is the SEC's filings database — every material event a US-listed company experiences must show up there, often within 4 days of the event. It's the canonical primary source. This skill turns it into a continuous signal feed for GTM teams pursuing public-company accounts: leadership changes, M&A, layoffs, restructurings, and 13F-disclosed institutional ownership all appear here before they hit the news.

**Built for:** Sales teams targeting public-company accounts ($1B+ market cap or US-listed mid-market), competitive intel teams tracking public competitors, and finance-vertical sellers who need fast triggers on AUM and institutional flow.

## When to Use

- "Watch SEC filings for {Company} or this list"
- "Surface 8-Ks for our target accounts this quarter"
- "Track competitor 10-Qs and proxy filings"
- "Set up the EDGAR monitor for the {Vertical} watchlist"

## What EDGAR provides

| Form | What it announces | Latency |
|---|---|---|
| **8-K** | Material event — usually within 4 business days | The most actionable form. Filed for: leadership change, layoff, M&A, lawsuit, financial restatement, regulatory action, dividend change, debt issuance, write-down |
| **10-Q** | Quarterly financial report | Within 40-45 days of quarter end |
| **10-K** | Annual financial report | Within 60-90 days of fiscal year end |
| **S-1** | IPO registration | At IPO filing |
| **S-3 / S-4** | Secondary offering / acquisition registration | When raising / acquiring |
| **13F** | Institutional fund holdings (≥$100M AUM funds) | Within 45 days of quarter end |
| **13G / 13D** | 5%+ ownership disclosure | Within 10 days of crossing the threshold |
| **DEF 14A** | Proxy statement (executive comp, board) | Annually, before AGM |
| **Form 4** | Insider transactions (officers, directors, 10% holders) | Within 2 business days |
| **NT-10K / NT-10Q** | Notification of late filing | Negative signal |

The 8-K is the primary value. It captures most signals that GTM teams care about and is filed within days, not months.

## Inputs

Required:
- **Watchlist** — companies to monitor. Each entry: CIK (preferred), ticker, or company name. The skill resolves name → CIK on first run and caches it.

Optional:
- **Forms to watch** — default: `[8-K, S-1, S-3, 13F, 13G, 13D, NT-10K, NT-10Q]`. Restrict the list to focus the noise.
- **8-K item filter** — 8-K is sub-categorized by item number. Default: all. Tighten to specific items (e.g., `[1.01, 1.02, 5.02, 8.01]` — material agreements, terminations, leadership change, other material events).
- **Cadence** — `daily` / `hourly` / `realtime`. Default: `daily`.
- **Webhook / Slack target** — where to push signals.

## EDGAR API Basics

EDGAR is publicly accessible at `https://data.sec.gov` with no auth, just rate limits (10 requests/sec, must include a User-Agent identifying yourself).

Key endpoints:
- `https://data.sec.gov/submissions/CIK{cik-padded-10-digits}.json` — recent filings for a company
- `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={cik}&type={form}&dateb=&owner=include&count=40` — by-form browse
- `https://www.sec.gov/Archives/edgar/data/{cik}/{accession-number-no-dashes}/{primary-doc}` — fetch the actual filing

The skill respects rate limits, batches lookups, and caches the static parts (CIK lookup, company facts).

## Workflow

### Step 1 — Resolve watchlist

For each entry:
- If CIK provided: use directly
- If ticker provided: look up via `https://data.sec.gov/submissions/CIK{cik}.json` (requires CIK; resolve ticker → CIK via the EDGAR ticker map at `https://www.sec.gov/files/company_tickers.json`)
- If company name only: search `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company={name}&type=&dateb=&owner=include&count=40`. Match the most likely candidate, flag for human verification.

Cache the CIK map locally; refresh weekly.

### Step 2 — Pull recent filings per company

For each company on the watchlist, fetch its filings since the last scan:

```
GET https://data.sec.gov/submissions/CIK{cik-padded}.json
```

Parse the `filings.recent` block for entries since `last_scanned`. Each entry has:
- `accessionNumber`
- `form`
- `filingDate`
- `reportDate`
- `primaryDocDescription`

Filter to the configured form list.

### Step 3 — For each new filing, extract the signal

#### 8-K parsing

The 8-K has a structured "Items" header. Map item codes to signal types:

| Item | Signal |
|---|---|
| 1.01 | Entry into a material definitive agreement |
| 1.02 | Termination of a material definitive agreement |
| 1.03 | Bankruptcy or receivership |
| 2.01 | Completion of acquisition or disposition |
| 2.02 | Results of operations and financial condition |
| 2.03 | Creation of a direct financial obligation (debt issued) |
| 2.04 | Triggering events for direct financial obligations |
| 2.05 | Costs associated with exit or disposal activities (often layoffs) |
| 2.06 | Material impairments / write-downs |
| 5.02 | Departure or appointment of directors / officers |
| 5.03 | Amendments to articles of incorporation or bylaws |
| 5.07 | Submission of matters to a vote of security holders |
| 7.01 | Regulation FD disclosure |
| 8.01 | Other events (material) |

Extract from the filing's primary document:
- The item(s) triggered
- 1-3 sentence summary of what happened
- The named individuals (for 5.02 leadership changes)
- The announced date of the event (vs. the filing date)
- Any associated dollar figures (acquisition price, debt amount, severance)

#### 13F parsing

13Fs disclose institutional fund holdings. For a sales team selling to/about institutional investors, 13Fs reveal when a fund opened or closed a position in a target company. Parse the form's `informationTable` for holdings + value.

#### S-1 / S-3 parsing

S-1 means IPO registration. S-3 means secondary offering. Both signal capital flow events. Extract:
- Filing type (initial vs. amendment)
- Estimated offering size
- Underwriters
- Risk factors mentioned (the long-tail signal — risk factors disclose what the company is actually worried about)

### Step 4 — Score and route signals

For each extracted event, assign:

```json
{
  "company_name": "",
  "cik": "",
  "ticker": "",
  "form": "",
  "filing_date": "",
  "event_date": "",
  "signal_type": "leadership_change | layoff | acquisition_announced | acquisition_completed | debt_issuance | material_writedown | bankruptcy | new_filing_late | revenue_release | proxy_filed | etc",
  "summary": "<1-3 sentence summary of the event>",
  "specifics": {
    "named_people": [],
    "dollar_figures": [],
    "implications": "<one line on what this signals for sales>"
  },
  "source_url": "https://www.sec.gov/...",
  "priority": "high | medium | low"
}
```

Priority logic:
- **High:** leadership change in C-suite, material acquisitions, layoffs (8-K item 2.05), bankruptcy
- **Medium:** debt issuance, secondary offering, proxy filings with executive-comp changes
- **Low:** routine quarterly filings without surprises, 13Fs unless watching specific institutional holders

### Step 5 — Deliver

Default output:

```markdown
## SEC EDGAR Scan — {date}

**Watchlist:** {N} companies
**New filings detected:** {M}
**High-priority signals:** {K}

### High-priority signals

#### {Company name} (Ticker) — Filed {date}
**Signal:** {signal_type}
**Summary:** {1-3 sentence summary}
**Specifics:**
- {named people}
- {dollar figures}
**Sales implication:** {one line — e.g., "New CFO; budget realignment likely 60-90 days"}
**Source:** [Filing on EDGAR]({source_url})

#### {Next company} ...

### Medium-priority signals
{table or summary form}

### Low-priority filings
{table — usually compressed}
```

Output destinations:
- Markdown report saved to disk
- Slack push (high-priority only) if webhook configured
- CRM annotation if integration is wired up
- CSV export for downstream tools

### Step 6 — Track since-last-scan state

Store per-company state:

```json
{
  "cik": "",
  "company": "",
  "last_filing_seen_accession": "",
  "last_scan_at": ""
}
```

So the next run only fetches deltas, not the full history.

## Edge Cases

- **Private companies on the watchlist** — EDGAR only covers SEC filers (mostly US public companies + some foreign + some VCs filing 13F/Form D). Private companies will return empty; flag them in setup.
- **Foreign filers** — many file 20-F (annual) or 6-K (interim) instead of 10-K / 8-K. Add these to the form list if watching ADRs.
- **Late filings (NT-10K / NT-10Q)** — usually a negative signal (financial control issues, restatement coming). Flag higher-priority than routine 10-Q.
- **Insider Form 4 noise** — for monitoring exec-team activity, Form 4 is firehose. Pre-filter to officers/directors with significant transactions ($100K+) or sustained selling patterns rather than every routine vested-RSU sale.

## Useful Recipes

### Recipe 1 — Layoff watch
Filter: 8-K, item 2.05 (Costs Associated with Exit or Disposal). High-priority. Triggers `negative-icp-scorer` re-evaluation for affected accounts.

### Recipe 2 — Leadership change
Filter: 8-K, item 5.02. Cross-reference the departed individual against `champion-departure-trigger` if they're a known champion. Cross-reference incoming with the prospect database for new-buyer outreach opportunity.

### Recipe 3 — M&A trigger
Filter: 8-K, items 1.01 + 2.01 (material agreements / acquisitions completed). For B2B sellers, this often signals integration spend, tooling consolidation, or vendor reviews — a 90-day window where buying decisions accelerate.

### Recipe 4 — Capital event
Filter: 8-K, items 2.03 + 2.04 (debt creation / triggering events) + S-3 (secondary offering). Material capital events often correlate with budget recalibration.

### Recipe 5 — Proxy / executive compensation
Filter: DEF 14A. Parse for new equity grant programs, severance arrangements, or "say on pay" controversies. Useful for HR/comp sellers and ABM teams targeting compensation committees.

## Cost

| Component | Cost |
|---|---|
| EDGAR API access | Free |
| Per-filing fetch + parse | ~$0.001 (LLM for summary) |
| Per-watchlist scan, daily | ~$0.05 for 50 companies |
| **Monthly cost, 100-company watchlist, daily scan** | **~$3** |

The skill is essentially free to operate at typical GTM scale.

## Tools Required

- HTTP client (built-in `fetch`); rate limit ≤10 requests/sec, identifying User-Agent
- LLM for summarizing filing text into the structured signal format
- Optional: Redis for state caching
- Optional: Slack webhook for high-priority alerts

## Trigger Phrases

- "Watch SEC filings for {Company}"
- "Surface 8-Ks for our target accounts"
- "Set up EDGAR monitor for {Vertical}"
- "Pull recent {form} filings for {company list}"
