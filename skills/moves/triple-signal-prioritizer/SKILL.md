---
name: triple-signal-prioritizer
description: >
  Compound account scorer that only enrolls accounts in outbound when
  three conditions are simultaneously true: ICP fit > threshold,
  behavioral intent in the last 14 days, and a timing trigger
  (funding, hire, renewal, news event). Eliminates list-blasting
  by demanding signal convergence rather than any-one-signal entry.
  Outputs a tier-ranked list with the convergence reasoning per row.
tags: [lead-generation]
---

# Triple Signal Prioritizer

The single biggest reason outbound underperforms is that lists get blasted on weak signals — fit alone, or intent alone, or timing alone. Each in isolation is noise. The convergence of all three at the same moment is what separates a 1% reply rate from a 12% one. This skill enforces that convergence: only accounts where all three light up *now* get enrolled.

**Built for:** SDR / sales-ops teams running modern signal-led outbound, especially when paired with intent data (G2, 6sense, Bombora, Common Room) and trigger sources (funding, hiring, news).

## When to Use

- "Run the triple-signal scan on this list"
- "Prioritize the {Vertical} target list"
- "Which accounts qualify under all three filters"
- "Build the high-conviction outbound queue for this week"

## The Three Signals

### Signal 1 — Fit
The static / firmographic match. From your ICP definition + company data:
- Industry tag match
- Headcount band match
- Stage match (seed / Series X / growth / public)
- Geography match
- Tech stack match (when applicable)
- Negative-ICP scorer pass

Fit score: 0-100 (passes at ≥75 by default).

### Signal 2 — Intent
The behavioral / dynamic signal. From any combination of:
- Visiting your competitor's pricing page (G2, 6sense)
- Visiting your own pricing page anonymously (Clearbit Reveal, Warmly)
- Reviewing on G2 / TrustRadius for category
- Posting publicly about your category problem (LinkedIn, Twitter, Reddit)
- Engaging with your content (LinkedIn employee posts, blog visits)
- Downloading content / attending webinar
- Signing up for a free tier (PQL signal)

Intent score: 0-100 (passes at ≥40 by default; intent thresholds are softer because intent is rarer).

### Signal 3 — Timing
The moment trigger. From any of:
- Funding round in last 90 days
- Specific role hired (CFO/CRO/CMO/RevOps lead/etc) in last 90 days
- Stated renewal window approaching (12-, 24-, 36-month from competitor close)
- Material news event (acquisition, layoff, lawsuit, executive change, product launch)
- Champion job change (departure or arrival)
- Earnings call mention of category problem
- Patent filing in relevant category

Timing flag: boolean. Either there's a trigger in the last 90 days or there isn't.

## The Rule

```
Enroll account = (Fit ≥ 75) AND (Intent ≥ 40) AND (Timing == true)
```

All three. No exceptions. The skill rejects single- or double-signal accounts, no matter how strong any one signal is.

## Inputs

Required:
- **Account list** — to be evaluated. Each entry: company, domain, optional contact data
- **ICP config** — for the Fit dimension (uses `negative-icp-scorer` config or a separate ICP file)
- **Intent source(s)** — at least one feed of intent data. Sources accepted:
  - 6sense / Bombora exports (CSV)
  - G2 buyer intent feed (API or CSV)
  - LinkedIn engagement data (from `linkedin-commenter-extractor` or `competitor-post-engagers`)
  - Web analytics deanonymization (Clearbit Reveal, Warmly)
  - Common Room / community engagement
- **Timing source(s)** — at least one trigger feed:
  - Funding events (`company-funding-search`)
  - Hiring signals (`linkedin-job-scraper`, `job-posting-intent`)
  - News (`signal-scanner`)
  - SEC filings (`sec-edgar-filings`)
  - Champion changes (`champion-departure-trigger`)

Optional:
- **Tier weighting** — boost convergence score for top-tier accounts
- **Deal context** — accounts already in pipeline / customer base get suppressed pre-scan

## Workflow

### Step 1 — Score Fit per account

Run each account through the ICP fit logic (or call `negative-icp-scorer` for the inverse). Output a 0-100 score and tag fit verdict:

```
fit_score: 0-100
fit_verdict: pass | borderline | fail
fit_reasons: [<top 3 reasons for the score>]
```

### Step 2 — Score Intent per account

Aggregate intent signals from configured sources. Each source contributes a sub-score; the highest single source's score sets the intent score (you don't double-count for the same intent showing up in multiple feeds).

```
intent_score: 0-100
intent_signals: [
  {source: "g2", action: "viewed competitor X pricing", date: "...", weight: 35},
  {source: "linkedin", action: "engaged with post about Y", date: "...", weight: 20}
]
intent_verdict: high | medium | low | none
```

Intent decays. A signal from 14 days ago is at full strength. Anything older than 30 days is discounted by 50%. Older than 60 days: ignored.

### Step 3 — Detect Timing trigger

Check each timing source for a recent (within 90 days) event:

```
timing_flag: true | false
timing_triggers: [
  {type: "funding_announced", date: "...", details: "Series B, $40M"},
  {type: "exec_change", date: "...", details: "New CRO from {prev co}"}
]
timing_recency_days: <days since most recent trigger>
```

### Step 4 — Apply the rule

```python
if fit_score >= 75 and intent_score >= 40 and timing_flag is True:
    enroll = True
else:
    enroll = False
```

Compute a **convergence score** for tiering:

```
convergence_score = (fit_score × 0.3) + (intent_score × 0.4) + (timing_recency_bonus × 0.3)
```

Where `timing_recency_bonus` scales 100 (today) down to 0 (90 days ago).

### Step 5 — Tier the enrolled accounts

| Tier | Convergence score | Action |
|---|---|---|
| **A — Hot** | ≥85 | Same-day outreach. Senior AE involvement. Multi-channel cadence. |
| **B — Warm** | 70-84 | Within-48h outreach. Standard SDR cadence. |
| **C — Standard** | 50-69 | Within-week outreach. Lighter sequence, higher volume tolerance. |

### Step 6 — Output

```markdown
## Triple-Signal Scan — {date}

**Total accounts evaluated:** {N}
**Single-signal hits (rejected):** {N1}
**Double-signal hits (rejected):** {N2}
**Triple-signal converged (enrolled):** {N3}
**Conversion rate (input → enrolled):** {pct}

---

### Tier A — Hot ({K} accounts)

#### {Account name}
- **Convergence score:** {N}
- **Fit:** {score} — {top reason}
- **Intent:** {score} — {top signal with date}
- **Timing:** {trigger type, date, detail}
- **Recommended action:** {first step + sender}
- **Why this is Tier A:** {specific reasoning combining the three}

#### {next account}...

### Tier B — Warm ({L} accounts)
{condensed format}

### Tier C — Standard ({M} accounts)
{table format}

---

### Rejected accounts — convergence failed

| Account | Fit | Intent | Timing | Missing |
|---|---|---|---|---|
| {company} | 82 | — | yes | No intent signal in 90 days |
| {company} | 90 | 75 | — | No timing trigger |
| ... | ... | ... | ... | ... |

(These don't get outreach now. The skill flags accounts that are *one signal away* from converging — these are the watchlist worth re-scanning monthly.)
```

### Step 7 — Watchlist management

Accounts that are **2 of 3 signals** are valuable. They're the most likely to converge soon. The skill maintains a separate watchlist:

```json
{
  "near_converge": [
    {
      "account": "",
      "missing_signal": "intent | timing",
      "current_signals": {
        "fit": 90,
        "timing": {flag: true, type: "funding"}
      },
      "watch_until": "<60 days from now>"
    }
  ]
}
```

Re-scan the near-converge list weekly. When the missing signal fires, the account moves to the enrollment queue automatically.

## Why convergence works

The math: if any one signal has a 5% conversion rate, requiring all three (each independent) raises the conversion to ~25-30% per converged account, even though it cuts the volume of accounts you can pursue by 80%+. Net pipeline improves because:

- Less time burned on weak prospects
- Sender reputation preserved (lower bounce + spam-flag rates)
- Reps prioritize the right accounts (no one's working a list of 5,000 names; they're working 50 high-conviction accounts)
- Reply rate compounds (a triple-signal account knows you researched them)

The downside: pure signal-led outbound runs out of hot accounts quickly. The skill is meant to feed the top of the funnel; you still need broader prospecting underneath to backfill.

## Edge Cases

- **No intent data feed configured** — the skill fails gracefully and tells the user this is "fit + timing only" (a 2-signal scan). Don't pretend convergence when one signal source is missing.
- **All accounts have intent but no timing triggers** — common for stable verticals. Recommend extending the timing window from 90 to 180 days, or accepting 2-signal results for that vertical with a noted lower confidence.
- **Account is in active pipeline / customer base** — pre-scan suppression. Never enroll an existing customer or open opportunity.
- **Same convergence event triggers multiple times** — if Acme has both a funding event and a hire event in the same 90-day window, both count, but the skill bonuses for compound timing rather than double-counting.
- **Tier A list grows beyond rep capacity** — flag this. Tier A → over rep capacity is a *good* problem, but it requires either expanding the team, raising the convergence threshold, or accepting that some Tier A accounts will get worked late. Don't silently let Tier A leak.

## Cost

| Component | Cost |
|---|---|
| Fit scoring | ~$0.005 per account |
| Intent aggregation | varies by source (mostly free if data exists) |
| Timing trigger checks | ~$0.05 per account if running upstream skills |
| Convergence math | Free |
| Output generation | ~$0.005 per converged account |
| **Per 1,000-account scan** | **~$50-75** |

## Tools Required

- ICP definition (config file or `negative-icp-scorer` config)
- At least one intent data feed (configured by user)
- At least one timing signal source (`signal-scanner`, `company-funding-search`, `linkedin-job-scraper`, `sec-edgar-filings`, `champion-departure-trigger`, etc.)
- LLM for reasoning generation (light usage)
- Read/Write for input/output

## Trigger Phrases

- "Run the triple-signal scan"
- "Prioritize {target list}"
- "Build the high-conviction queue"
- "Which accounts qualify under all three filters"
