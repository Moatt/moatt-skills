---
name: boomerang-90day-reengage
description: >
  For closed-lost deals, monitor for trigger conditions changing — new
  funding, exec change, competitor renewal window approaching, product
  update addressing original loss reason, layoff/hiring shift, or news
  signal — and auto-create a re-engagement task when 2+ conditions
  changed since the loss. Generates a personalized re-engagement message
  anchored to the specific change, not a generic "checking in."
tags: [outreach]
---

# Boomerang 90-Day Re-engage

The closed-lost CRM stage is full of pipeline. Most teams ignore it because re-engagement at the wrong time looks desperate, and at the right time is hard to detect. This skill watches the conditions that caused the loss and triggers a re-engage when those conditions change — quantifiably. The skill is named "90-day" because that's the typical sweet spot, but the cadence is signal-driven, not calendar-driven.

**Built for:** AEs and sales ops who have hundreds of closed-lost deals sitting in CRM and want a low-effort way to re-engage the ones that became more pursuable.

## When to Use

- "Run the boomerang scan on closed-lost deals"
- "Re-engage closed-lost deals from 2024"
- "Find which lost deals are now ready"
- "Check for re-engagement signals on {Account}"

## Phase 0: Intake

Required (one-time setup):
- **Closed-lost source** — CRM access (HubSpot, Salesforce) or CSV export with: account name, contact, primary contact email, close date, loss reason, deal value, original AE
- **Loss-reason taxonomy** — the standardized reasons used by your team. Common: `too_expensive`, `missing_feature`, `too_complex`, `chose_competitor`, `bad_timing`, `no_budget`, `no_champion`, `wrong_fit`, `lost_internal_battle`, `unknown`
- **Product changelog** — what's shipped since each deal closed. Used to detect "missing feature → now exists" condition changes.
- **Watch cadence** — daily / weekly / monthly. Default: weekly.

Optional:
- **Original AE per deal** — so re-engagement comes from the same person
- **Won-back analog references** — "we previously closed-lost {company X}, re-engaged them, and won 8 months later" examples

## Phase 1: Define triggers per loss reason

Each loss reason maps to a set of "this changed" signals. The skill fires re-engage when 2+ signals fire for the same account.

### `too_expensive`
- New funding round announced (more budget)
- Mass hiring (growing budget)
- Competitor in current stack just renewed (price renegotiation window)
- We launched a smaller-tier / startup pricing
- Their reported revenue grew >30% (proxy: headcount, news)

### `missing_feature`
- We shipped the missing feature (changelog match)
- They publicly mentioned the gap (LinkedIn post, podcast, support thread)
- Their workaround broke (e.g., a tool they were using sunset)

### `too_complex`
- We launched simplified onboarding / UX overhaul (changelog)
- They hired a role that suggests they have capacity now (e.g., "Head of RevOps")
- They're moving up-market and have professional services budget

### `chose_competitor`
- Their competitor is approaching renewal (12-month, 24-month, 36-month windows from win-loss tracking)
- Public negative news about the competitor (G2 review velocity, layoffs, acquisition rumors, security incident)
- Their original buyer left
- The competitor was acquired (uncertainty in the buyer's mind)

### `bad_timing`
- They named a specific re-engage trigger ("after we finish migration") and it's done
- The thing they were doing is done (verifiable from news / hiring / posts)
- The fiscal year / quarter they were closing books on has passed

### `no_budget`
- New funding (most direct)
- New CFO / CRO (often re-allocates budget)
- Mass hiring in their function (suggests budget freed up)

### `no_champion`
- They hired a relevant role (potential new champion) — see `champion-departure-trigger` for inverse play
- The original blocker left
- A peer company (their reference base) just bought us

### `wrong_fit`
- Their stated reason was vertical-specific and we now serve that vertical
- Their size has shifted toward our ICP
- They've pivoted into a use case we serve

### `lost_internal_battle`
- The exec who pushed for the alternative left
- The alternative tool failed publicly
- A new internal advocate appears (we detect via post engagement, conference attendance, etc.)

### `unknown`
- Treat as `no_champion` for trigger purposes; bias toward fewer false positives

## Phase 2: Scan signals per account

For each closed-lost account in scope, run signal checks aligned to its loss reason.

### 2A — Funding signal
**Skill:** `company-funding-search` (existing)
- New round in last 180 days?
- Round size + stage
- Lead investor + co-investors

### 2B — Hiring signal
**Skill:** `linkedin-job-scraper` or `job-scraper` (existing)
- Mass hiring (>20% headcount growth in 90 days)?
- Specific role posted (champion candidate, CFO/CRO/CMO, RevOps, etc.)
- Role aligned to the original deal's domain?

### 2C — Exec change signal
**Skill:** `linkedin-profile-post-scraper` for known stakeholders + `company-intel`
- Original blocker left?
- New decision-maker arrived?

### 2D — Competitor signal
- If loss reason was `chose_competitor`: estimate competitor renewal window (12/24/36 months from close date)
- Negative news about competitor in last 90 days?

### 2E — Product fit signal
- For `missing_feature`: changelog match between deal date + today against the gap
- For `too_complex`: have we shipped simplification?
- For `too_expensive`: is there now a tier that fits their stated budget?

### 2F — News/momentum signal
- Web search for company name + last 90 days
- Material events: launch, acquisition (theirs), expansion, awards

## Phase 3: Score per account

Score each closed-lost account 0-100:

```
Boomerang Score = signal_count × signal_strength × deal_size_multiplier / time_decay
```

Where:
- `signal_count`: number of distinct trigger signals firing (≥2 required to even consider)
- `signal_strength` (per signal):
  - Funding round announced: 35
  - Original blocker left: 30
  - We shipped the missing feature: 30
  - Competitor approaching renewal: 25
  - Mass hiring: 20
  - Material news about them: 15
  - Other: 10
- `deal_size_multiplier`:
  - >$500K original ACV: 1.5x
  - $100K-$500K: 1.2x
  - $20K-$100K: 1.0x
  - <$20K: 0.7x
- `time_decay`:
  - 0-3 months since close: 0.5x (too soon)
  - 3-12 months: 1.0x (sweet spot)
  - 12-24 months: 1.2x (extra value when long enough)
  - 24+ months: 1.0x (stale but still possible)

Tier the results:

| Score | Tier | Action |
|---|---|---|
| ≥ 70 | Hot — pursue now | Personalized sequence, original AE |
| 40-69 | Warm — scheduled re-engage | Lightweight sequence, original AE |
| 20-39 | Cold — note for later | Add to nurture list, no immediate action |
| < 20 | Skip | Insufficient signal |

Below 2 signals: never trigger regardless of strength. Single-signal re-engagements feel like cold outreach to the buyer.

## Phase 4: Generate the re-engage message

The message must anchor on the *specific change*, not be a generic "checking in." Generic re-engagement reads as desperate.

### Pattern: signal-anchored opener

```
Subject options (A/B/C):

A: "Saw the news about {specific change} at {their company}"
B: "{specific change} — felt right to reach back out"
C: "Worth another look now that {specific change}?"

Body:

Hi {first name},

We talked back in {month, year} about {1-line summary of original deal context}. At the time, you flagged {original loss reason in their language} — fair call.

Two things changed since then:

1. {Specific change 1, with source}. {What it means for them.}
2. {Specific change 2, with source}. {What it means for them.}

{Optional: A single sentence about what's different on our side that maps to their original concern, e.g., "And on our side, we shipped {feature you wanted} in {date} — {customer X} adopted it for {use case}."}

If those changes shift the math at all, would 15-20 minutes make sense?

{Original AE first name}
```

### Why this lands

1. **Acknowledges the loss** — not pretending the prior conversation didn't happen
2. **Names the specific signal** — proves you watched, didn't just set a calendar reminder
3. **Connects the signal to their decision math** — explains why now
4. **Soft, low-friction ask** — they don't have to commit to anything

### Sequence
- **Email 1: Day 0** (signal-anchored, above)
- **Email 2: Day 7** if no reply — share a relevant artifact (case study from a similar account that came back, a brief teardown of how the new condition affects their math)
- **Email 3: Day 14** if still no reply — soft permission close: "happy to come back when timing fits, just close the loop here"

Three emails. No more. This is a high-trust play; keep it tight.

## Phase 5: Output

```markdown
## Boomerang Scan — {date}

**Closed-lost accounts in scope:** {N}
**Accounts with 2+ signals (re-engageable):** {M}

### Hot tier ({N} accounts)
| Account | Original close date | Loss reason | Score | Signals | Suggested AE |
|---|---|---|---|---|---|
| {co} | {date} | {reason} | {score} | {1: funding raised, 2: original blocker left} | {AE name} |
| ... | ... | ... | ... | ... | ... |

### Warm tier ({M} accounts)
{same table}

### Per-account dossier (Hot tier only)

#### {Account name} — score: {N}
- **Original deal:** ${amount} ACV, closed-lost {date}, {AE name}
- **Original loss reason:** {reason — direct quote from CRM}
- **Signals fired:**
  - {Signal 1}: {date detected, source, link}
  - {Signal 2}: {date detected, source, link}
- **Re-engage email draft:** [path to draft]
- **Recommended next step:** {AE name to send Day 0 email; sequence pre-loaded in {tool}}

### Output files
- `closed-lost-scan-{date}.csv` — full results with scores
- `drafts/{account-slug}-day0.md` — Day 0 emails per Hot account
- `drafts/{account-slug}-day7.md` — Day 7 follow-ups
- `drafts/{account-slug}-day14.md` — Day 14 close
- `signals-detected.json` — raw signal data per account
```

## Phase 6: Tracking

Per account triggered, log to `boomerang-tracker.json`:

```json
{
  "account": "",
  "original_close_date": "",
  "original_loss_reason": "",
  "signals_fired": [],
  "score": 0,
  "tier": "",
  "ae_assigned": "",
  "day0_sent_at": null,
  "day7_sent_at": null,
  "day14_sent_at": null,
  "outcome": "no_reply | replied_positive | replied_neutral | meeting_booked | opportunity_reopened | closed_won | declined",
  "revenue_attributed": 0
}
```

Run a monthly review: signals → meetings → opportunities → revenue. The funnel tells you which signals are actually predictive vs. noise. Tune signal weights accordingly.

## Edge Cases

- **Account is now in active pipeline (different deal)** — skip. Don't double-touch.
- **Original AE has left the company** — fall back to current account owner; re-write the email tone (someone unfamiliar reaching out for the first time, but acknowledging prior history).
- **Account became a competitor** — skip. Check competitor list before triggering.
- **Loss reason was "wrong_fit" with no possible signal change** — exclude from scope. Some losses are permanent, and the skill should know that.
- **Account closed its operations or got acquired** — skip. Re-engaging the dissolved entity wastes effort. The acquired version is a new account; re-engage that separately if relevant.

## Cost

| Component | Cost per account |
|---|---|
| Funding signal | ~$0.05 |
| Hiring signal | ~$0.05 |
| Exec change signal | ~$0.10 |
| Competitor / news signal | ~$0.05 |
| Score + draft generation (Hot tier only) | ~$0.10 |
| **Per account scanned** | **~$0.20-0.30** |
| **Typical 200-account scan** | **~$40-60/month** |

The ROI math is brutal: a single reopened opportunity at typical ACV pays for years of scans.

## Tools Required

- CRM access for closed-lost data + ongoing pipeline check
- `company-funding-search` (existing)
- `linkedin-profile-post-scraper` (existing)
- `linkedin-job-scraper` (existing) or `job-scraper` (existing)
- `company-intel` (existing)
- LLM for draft generation
- Optional: `signal-scanner` (existing) for orchestration

## Trigger Phrases

- "Run the boomerang scan"
- "Re-engage closed-lost deals from {year}"
- "Find which lost deals are ready"
- "Check re-engagement signals on {Account}"
