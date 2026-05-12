---
name: intent-fit-matrix-router
description: >
  Real-time inbound lead router that scores each incoming form fill,
  demo request, free-trial signup, or PQL on a 2x2 matrix — ICP fit
  (firmographic + technographic) by behavioral intent strength —
  and routes to Hot/Warm/Cold lanes with different SLAs. Distinct
  from triple-signal-prioritizer (which is for outbound batch
  scanning); this runs synchronously on inbound at the moment of
  capture so the right rep reaches out within minutes.
tags: [lead-generation]
---

# Intent / Fit Matrix Router

Inbound speed-to-lead is one of the highest-leverage variables in B2B sales: the rep who replies in 5 minutes converts at 10x the rep who replies in an hour. But not every inbound deserves the same SLA — a Tier-1 ICP with strong intent should hit the AE's calendar instantly; a low-fit casual reader should not interrupt anyone. This skill scores each inbound at capture-time and routes accordingly.

**Built for:** Marketing/RevOps teams running inbound forms, demo requests, free trials, content downloads, or chatbot conversations who want every inbound to be triaged automatically.

## When to Use

- "Route this inbound lead"
- "Score and route the demo request from {Account}"
- "Run the matrix on inbound from the last 24 hours"
- "Wire up the form-fill router"

## The Matrix

| | High intent | Medium intent | Low intent |
|---|---|---|---|
| **High fit** | **Hot** — book directly with AE in <5 min | **Warm** — SDR within 1 hour | **Watch** — nurture sequence |
| **Mid fit** | **Warm** — SDR within 1 hour | **Standard** — SDR within 24 hours | **Marketing-only** |
| **Low fit** | **Manual review** — likely competitor / wrong audience | **Marketing-only** | **Suppress** |

Each lane has different SLAs, different sender, and different content treatment.

## Inputs

Required:
- **Inbound payload** — form-fill, demo-request, signup, or PQL event with at minimum: email + a source identifier (which form, which page, which UTM)

Configuration (per-client, set once):
- **ICP definition** — firmographic + technographic criteria
- **Intent signal definitions** — what makes intent "high" vs. "medium" vs. "low"
- **Lane SLAs** — how fast each lane is expected to be acted on
- **Sender assignments per lane** — AE for Hot, SDR for Warm/Standard, marketing automation for Watch/Marketing-only

## Fit Scoring

Two paths run in parallel:

### Path A — Quick fit (synchronous, sub-second)

Cheap signals available at capture-time:
- **Email domain** → company → industry, size, stage (cached account directory)
- **Form-field self-report** — if the form asks "company size" / "industry" / "role"
- **Page context** — was this captured on `/enterprise` (high-fit signal) vs. `/free-tier` (mid-fit signal)?
- **UTM source** — paid Google search for high-intent keywords vs. organic blog scroll

Score: 0-100. Pass-through threshold for "fit": ≥75 (high), 50-74 (mid), <50 (low).

### Path B — Deep fit (async, runs in background)

Slower signals fired in parallel for the rep's reference:
- Tech stack detection (BuiltWith / Wappalyzer if available)
- Funding / hiring signals (cross-reference with `signal-scanner`)
- Negative-ICP check (cross-reference with `negative-icp-scorer`)
- Lookup against existing CRM (`lead-to-account-matcher`)

These don't block routing — they enrich the rep's brief.

## Intent Scoring

| Intent signal | Weight |
|---|---|
| Direct demo request | 40 |
| Pricing-page form fill | 35 |
| Free-trial signup | 30 |
| ROI calculator engagement | 25 |
| Specific high-intent content (case study, security white paper) | 20 |
| Webinar attendance | 15 |
| Newsletter signup | 5 |
| Generic blog content | 5 |
| Multiple touches in last 14 days | +15 (compound) |

Sum across signals (most recent 30 days). Bands:
- **High intent:** ≥40
- **Medium intent:** 20-39
- **Low intent:** <20

## Workflow (per inbound)

### Step 1 — Capture and normalize

Receive the inbound event with at minimum email + source. Parse:

```json
{
  "id": "<event id>",
  "email": "",
  "first_name": "",
  "last_name": "",
  "company": "",
  "form_fields": {<all submitted fields>},
  "source": {
    "type": "demo_request | trial_signup | content_download | webinar | chatbot | pricing_form",
    "page": "<URL>",
    "utm": {<utm tags>}
  },
  "captured_at": "<timestamp>",
  "ip": "<for IP-resolution>",
  "session_history": [<prior page views in last 30 days>]
}
```

### Step 2 — Run quick-fit + intent scoring synchronously

Compute fit_score and intent_score from the cheap signals above. This must happen in <500ms to maintain speed-to-lead.

### Step 3 — Place in the matrix

```
fit_band = high (≥75) | mid (50-74) | low (<50)
intent_band = high (≥40) | medium (20-39) | low (<20)
lane = matrix[fit_band][intent_band]
```

### Step 4 — Route

| Lane | Action |
|---|---|
| **Hot** | Trigger calendar booking widget; if not self-booked in 3 minutes, fire Slack alert to assigned AE with one-line brief |
| **Warm** | Create CRM task for SDR within 1-hour SLA; SDR's queue page lights up |
| **Standard** | Add to SDR daily queue; standard sequence enrollment after 24 hours |
| **Watch** | Add to marketing nurture; no SDR action |
| **Marketing-only** | Marketing automation handles; no sales touch |
| **Manual review** | Flag for human routing; don't auto-suppress (could be a misclassified high-fit) |
| **Suppress** | Add to suppression list; no further marketing or sales |

### Step 5 — Notify rep + brief

For Hot and Warm lanes, the assigned rep gets:

```markdown
## Hot inbound: {first_name} {last_name} @ {Company}

**Source:** {form / page / event}
**Captured:** {time, X minutes ago}
**Fit:** {score}/100 — {top 2 fit reasons}
**Intent:** {score} — {top 2 intent signals}
**Recommended SLA:** Reply within {time}

### Quick brief (deep fit, async-pulled)
- Tech stack: {top items}
- Open jobs: {count + titles}
- Recent activity: {posts, news}

### Suggested opening
"{1-line tailored opening referencing the specific page/form they used + the strongest fit signal}"

### CRM check
{lead-to-account-matcher result — net-new vs. existing, suppression status}
```

### Step 6 — Track conversion by lane

Every routed lead is tracked through the funnel. Periodically:

- **Hot lane conversion to meeting booked:** target 50%+
- **Warm lane conversion to meeting booked:** target 20%+
- **Standard lane conversion:** target 5%+

If conversion rates collapse, either the matrix scoring is wrong (false positives in Hot) or the SLA isn't being met. The skill outputs a weekly report.

## Lane Detail

### Hot lane mechanics
- Self-book widget (Chili Piper / Calendly inline)
- 3-minute self-book window
- Slack alert if not booked: AE has 5 minutes to claim
- Out-of-office or unclaimed → escalate to AE manager

### Warm lane
- 1-hour SLA
- SDR queue with high-priority flag
- Pre-loaded sequence: persona-on-the-fly opener + multichannel cadence kickoff

### Standard lane
- 24-hour SLA
- Standard SDR queue
- Standard sequence

### Watch / Marketing-only
- No human touch
- Marketing automation enrolls in nurture
- Re-evaluated when intent score increases

## Edge Cases

- **Existing customer fills the form** — `lead-to-account-matcher` catches this; route to CSM, not Hot lane.
- **Active opportunity (other rep)** — same; notify rep, don't double-touch.
- **Competitor employee** — `negative-icp-scorer` catches; suppress.
- **Personal email on a Hot-lane signal** — slightly downgrade fit, but don't auto-suppress; could be a real prospect using a personal address (consultants, executives).
- **Burst of leads from the same IP / company in a short window** — buying-committee event. Cluster into a single account-level alert; don't fire 5 separate Slack alerts to the same AE.
- **Bot / fake form fills** — pre-filter by IP reputation, email validity, and behavioral patterns (form completion in <2 sec is a bot signal). Don't route bots.

## Cost

| Component | Cost per inbound |
|---|---|
| Quick-fit scoring (sync) | ~$0.001 |
| Intent scoring | ~$0.001 |
| Routing logic | Free |
| Async deep-fit (when fired) | ~$0.05 |
| Brief generation (Hot/Warm only) | ~$0.01 |
| **Per inbound** | **~$0.05-0.06** |

For 1,000 inbounds/month: ~$50-60 in scoring + brief costs. Speed-to-lead conversion lift typically 2-5×.

## Tools Required

- LLM for brief generation
- ICP config (shared with `negative-icp-scorer`)
- CRM integration for task creation
- Calendar booking widget (Chili Piper, Calendly, or equivalent) for Hot lane
- Slack webhook for rep alerts
- Optional: `lead-to-account-matcher` (Wave 2) — strongly recommended

## Trigger Phrases

- "Route this inbound lead"
- "Run the matrix on inbound"
- "Score and route demo request from {Account}"
- "Wire up the form-fill router"
