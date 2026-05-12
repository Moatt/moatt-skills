---
name: layoffs-fyi-monitor
description: >
  Monitor layoffs.fyi (the public layoff tracker) for layoff events
  at target companies. Surface event details — date, percentage,
  function affected — and route signals: distress flag for sales
  pursuit (deprioritize OR hyper-target depending on context),
  champion-departure check (was your champion in the layoff?), and
  potential displaced-buyer outreach (people impacted are looking
  for new tools at their next gig).
tags: [research, competitive-intel]
---

# Layoffs.fyi Monitor

The public layoffs tracker at layoffs.fyi is the most consistent source for layoff intelligence — startups and tech companies of all sizes get surfaced there within hours of an event. This skill turns layoff data into structured GTM signals: company-distress flags for the sales pursuit lane, champion-departure checks for retention, and displaced-buyer leads for outreach.

**Built for:** Sales and CS teams that need to react to customer / prospect distress events without hand-curating layoff news daily.

## When to Use

- "Monitor layoffs at our target accounts"
- "Did any of our customers have layoffs this week?"
- "Run the layoff scan"
- "Find displaced buyers from {Company}'s layoff"

## How layoffs affect GTM

Layoffs create three distinct signal types depending on context:

### Signal A — Distress / pause
For an account in active pipeline:
- Layoff = budget freeze, exec attention shifted, deal slowdown
- Action: pause aggressive outreach for 60-90 days; flag deal as at-risk

### Signal B — Champion / customer retention risk
For an existing customer:
- Layoff = potential churn signal (champion gone, budget cuts incoming)
- Action: CSM outreach to verify champion is still there; renewal-readiness review
- Cross-reference with `champion-departure-trigger` for specific departure detection

### Signal C — Displaced buyer opportunity
For people affected:
- Displaced buyers go to new companies in 30-90 days
- They take their tool preferences with them (similar to `champion-departure-trigger`'s warm-prospect play)
- Action: warm follow-up at their next destination

The skill detects which signal applies per event and routes accordingly.

## Inputs

Required:
- **Watchlist** — target companies (your customers, pipeline, prospects)

Optional:
- **CRM access** — to determine pipeline stage / customer status / champion status per affected company
- **Cadence** — `daily` / `weekly`. Default: daily for fast-moving distress signals.

## Data Source

layoffs.fyi publishes the data publicly:
- The site itself (`https://layoffs.fyi/`) — searchable list with filters
- A public Google Sheet (the same data, machine-readable)
- Sometimes mirrored on Kaggle by community

The skill reads the public data via web fetch / sheets API.

Per layoff event, the data typically includes:
- Company name
- Headquarters
- Date
- Number of laid off
- Percentage of workforce
- Industry
- Stage (Series A, B, public, etc.)
- Funding raised
- Source URL (typically a TechCrunch / news article)

## Workflow

### Step 1 — Pull recent layoff events

Fetch all layoff events since the last scan from the public source. Normalize the schema:

```json
{
  "company_name": "",
  "company_normalized": "<normalized for matching>",
  "hq": "",
  "date": "",
  "laid_off_count": 0,
  "laid_off_pct": 0.0,
  "industry": "",
  "stage": "",
  "funding_raised": 0,
  "source_url": ""
}
```

### Step 2 — Match against watchlist

For each event, run name-matching against the watchlist:
- Exact match
- Fuzzy match (Levenshtein, token-set ratio)
- Domain-level match if domains are configured

A match doesn't always mean a hit — common names ("Acme") need disambiguation. Verify via location, industry, or stage when matching is ambiguous.

### Step 3 — Determine signal type

For each matched account, route based on CRM status:

| Account status | Signal type | Action |
|---|---|---|
| Active opportunity | Distress (Signal A) | Pause aggressive outreach for 60-90 days; flag deal at-risk |
| Existing customer | Retention risk (Signal B) | CSM outreach to verify champion + assess churn risk |
| Customer at-risk already | Retention urgent | Escalate to senior CSM / save-the-account play |
| Cold prospect | Distress (downgrade) | Move from outbound queue to nurture for 90 days |
| Closed-lost | Note in record | No action; flag for future re-engage |
| No match (net-new event) | Displaced-buyer opportunity | Surface for follow-up at affected employees' next destinations |

### Step 4 — Detect displaced-buyer leads

For each layoff event, attempt to identify the affected employees:

1. Search LinkedIn for posts from people at the company in the last 14 days that mention the layoff (open-to-work posts, "after my time at X" posts)
2. Cross-reference with known champions / past buyers from your CRM
3. Flag champion-overlap explicitly

For displaced employees who match known buyer profiles:
- They will land at a new company in 30-90 days (median: 60 days)
- Add them to a `displaced-buyer-watch` list
- When they update their LinkedIn to a new company, fire `champion-departure-trigger`-style warm outreach

### Step 5 — Output

```markdown
## Layoff Scan — {date}

**Watchlist accounts:** {N}
**New layoff events detected:** {M}
**Account hits:** {K}

---

### Signal A — Distress (active opportunities) ({N_a})

#### {Account name} — Pipeline opportunity owned by {AE}
- **Layoff:** {N} people on {date}, {pct}% of workforce
- **Industry:** {industry}
- **Source:** [News article]({url})
- **Recommended action:** Pause aggressive outreach 60-90 days. Flag deal at-risk in CRM. AE check-in with champion to assess impact.
- **Champion check:** {if any current champion is at affected company, cross-reference for departure}

### Signal B — Customer retention risk ({N_b})

#### {Account name} — Existing customer, ${ARR}
- **Layoff:** {N} people on {date}, {pct}%
- **Champion status:** {Verify within 7 days}
- **Renewal date:** {date}
- **Recommended action:** CSM outreach within 48h. Confirm champion still at company; assess budget impact for renewal.

### Signal C — Displaced-buyer opportunities

#### {Affected employee name} — laid off from {Company}
- **Their prior role:** {title}
- **Were they a champion at any of our accounts?** {yes — at {prior co} | no — net-new}
- **LinkedIn:** {URL}
- **Recommended action:** Add to `displaced-buyer-watch`; auto-fire warm outreach when they land at a new company.

---

### Net-new events (no watchlist match)

| Company | Date | Laid off | % | Stage | Industry | Source |
|---|---|---|---|---|---|---|

(Tracked for trend analysis; no immediate sales action.)

---

### Trend summary
- Layoffs in {your industry} this week: {N}
- Layoffs at companies in {target ICP segment}: {N}
- {LLM-generated commentary on whether the macro trend should shift outbound strategy}

### Output files
- `layoff-scan-{date}.md`
- `layoff-scan-{date}.csv` — all events
- `account-hits-{date}.csv` — account-matched events for CRM annotation
- `displaced-buyer-watch-{date}.csv` — for ongoing tracking
```

### Step 6 — CRM annotation

For each account hit, optionally:
- Annotate the CRM record with the layoff event + recommended action
- Create a CSM/AE task with the appropriate SLA
- Update deal at-risk flag for active opportunities

### Step 7 — Continuous displaced-buyer tracking

The `displaced-buyer-watch` list is monitored continuously:
- Weekly LinkedIn check on each watched person
- When their company changes, fire `champion-departure-trigger`-style warm outreach
- Median resolution: 30-90 days after the layoff event

This converts the loss event into pipeline.

## Anti-patterns

- **Aggressive outreach to laid-off employees within days** — exploitative and brand-damaging
- **Pursuing distressed companies with full-court-press outbound** — often counter-productive; the budget isn't there, and you're remembered as the rep who reached out during the worst week
- **Ignoring layoffs at customers** — passive customers in distress quietly downgrade or churn at renewal; proactive engagement is significantly better than reactive
- **Treating all layoffs the same** — a 3% layoff at a 5,000-person company is different from a 30% layoff at a 100-person company. The skill segments by severity.

## Edge Cases

- **Same name, different companies** — disambiguate by location, industry, stage. Don't merge events.
- **Layoff event is later updated / corrected** — re-fetch and update the record. Don't trust the first-fetched data as permanent.
- **Bankruptcy / shutdown** — different action class. Don't displaced-buyer-pursue from a fully shut down company unless people are publicly announcing their next moves; do flag the account for permanent suppression.
- **Company name change before the layoff** — match against historical names if possible.
- **PE-backed restructuring vs. distress layoff** — PE-driven layoffs often signal expansion + new direction (different from distress). Cross-reference with funding context.

## Cost

| Component | Cost |
|---|---|
| layoffs.fyi data fetch | Free |
| Per-event matching | Free (local) |
| Cross-reference with watchlist | Free |
| Displaced-buyer LinkedIn check | ~$0.05 per affected person |
| Report generation | ~$0.05 |
| **Per scan, 200-account watchlist, daily** | **~$1-5/month** |

## Tools Required

- HTTP fetch / Google Sheets API for layoffs.fyi data
- CRM read access for account-status lookup
- LLM for narrative generation
- Optional: `linkedin-profile-post-scraper` (existing) for displaced-buyer detection
- Optional: `champion-departure-trigger` (Wave 1) for downstream warm outreach

## Trigger Phrases

- "Monitor layoffs at our target accounts"
- "Did any customers have layoffs?"
- "Run the layoff scan"
- "Find displaced buyers from {Company}"
