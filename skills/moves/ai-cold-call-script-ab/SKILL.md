---
name: ai-cold-call-script-ab
description: >
  Generate three opener variants for a cold call segment, run them
  through real call transcripts to identify the highest-conversion
  opener (measured by talk-time-after-opener as proxy), and ship the
  winning variant as the default for that segment. Replaces hunch-based
  opener choice with measured A/B/C comparison grounded in actual
  Gong/Chorus call data.
tags: [outreach]
---

# AI Cold Call Script A/B

Most cold-call openers are either (a) inherited from whoever the team's first SDR was, or (b) the rep's personal preference. Neither is calibrated to what actually keeps prospects on the phone for the next 90 seconds. This skill generates three structured opener variants per segment, scores each against real call recordings, and surfaces the winner with explicit metrics.

**Built for:** SDR teams running 100+ cold calls per week per rep, with call recordings available (Gong, Chorus, ZoomInfo Engage, or any call recorder), who want to stop debating opener mechanics and start measuring them.

## When to Use

- "Generate opener variants for {Segment}"
- "Run the A/B on cold-call openers"
- "Which opener is winning for {ICP segment}?"
- "Build new variants for {role} prospects"

## What the skill measures

The proxy for opener quality is **talk time after opener** — how long the prospect stays on the call past the opener+permission segment (typically the first 15-30 seconds). It's not perfect (some prospects stay on a call to politely decline), but it correlates strongly with positive next-action rates.

Other proxies the skill tracks:
- **Hangup rate** — how often the prospect hangs up during or right after the opener
- **Permission grant rate** — how often the prospect explicitly says "sure, what's up" or equivalent
- **Pushback rate** — how often the opener triggers an immediate "I'm not interested"
- **Next-action rate** — how often the call ends with a booked meeting, follow-up scheduled, or referral

## Inputs

Required:
- **ICP segment** — the specific prospect profile (vertical, role, size band)
- **Offer one-liner** — what the rep is selling
- **Sample call recordings** — minimum 30 calls per variant for statistical signal. From Gong/Chorus/etc., or transcripts in any standard format.

Optional but improves quality:
- **Existing top-performing opener** — to use as the control variant (so the test is variant-vs-current, not variant-vs-nothing)
- **Rep voice profile** — match script tone to how reps actually talk
- **Pain hypotheses** — known prospect frustrations to anchor the opener

## Workflow

### Step 1 — Generate three variants

Each variant follows a different structural pattern:

#### Variant A — Pattern interrupt
```
"{First name}? Hey, this is {sender}. I'll be honest — this is a cold call.
I picked up the phone for one specific reason: {one-line trigger}.
You probably weren't expecting me. Two minutes to explain, and if you say
'no thanks,' I hang up?"
```

#### Variant B — Permission-first
```
"{First name}? Hi, {sender} here. Quick one — I'm reaching out because
{one-line trigger about their company}. Bad time?"
```

#### Variant C — Curiosity hook
```
"{First name}? {Sender}. Saw you {specific public action}. Quick
question that probably doesn't have an obvious answer — {curiosity-led
question that opens to the prospect's perspective on a category problem}.
Got 60 seconds?"
```

(The skill picks the structural variants based on what's already-existing in the segment — if Variant A is the current default, the test is B vs. C vs. A as control.)

### Step 2 — Run each variant through call transcripts

For each variant assigned to ≥30 prospects:

1. Pull call recordings/transcripts where that variant was used
2. Annotate each call:
   - Did the prospect hang up before second 15?
   - Did the prospect explicitly grant permission to continue?
   - Did the prospect push back (interrupt to decline)?
   - Total prospect talk-time after second 15
   - Total call length
   - Outcome (booked / declined / undecided / wrong-person)

3. Compute per-variant metrics:
   - Hangup rate (% before sec 15)
   - Permission grant rate (% explicit yes)
   - Talk time after opener (median seconds)
   - Pushback rate (% immediate decline)
   - Next-action rate (% with positive outcome)

### Step 3 — Identify winner

Composite score per variant:

```
score = (next_action_rate × 50) +
        (talk_time_after_opener_normalized × 30) +
        (permission_grant_rate × 20) -
        (hangup_rate × 30) -
        (pushback_rate × 20)
```

Statistical significance check: 30+ calls per variant minimum. Skill flags low-confidence verdicts when sample is borderline.

### Step 4 — Output

```markdown
## Cold Call Opener A/B — {Segment}

**Period:** {date_range}
**Sample size per variant:** {N_per_variant}

### Results

| Variant | Pattern | Hangup % | Permission % | Avg talk-time-after | Pushback % | Next-action % | Composite |
|---|---|---|---|---|---|---|---|
| A — Pattern interrupt | ... | 12% | 31% | 47s | 14% | 8.2% | 65 |
| B — Permission-first | ... | 8% | 42% | 53s | 11% | 11.4% | 78 ⭐ |
| C — Curiosity hook | ... | 15% | 28% | 38s | 18% | 6.1% | 52 |

**Winner:** Variant B — Permission-first
**Confidence:** High (N = {N_per_variant} per variant; effect size {x}σ over runner-up)

### Why B won
- Highest permission grant rate (42% vs. 31% / 28%) — prospects explicitly accepted the conversation
- Lowest pushback rate (11%) — fewer immediate "not interested" interrupts
- Strong talk-time (53s median) — prospects stayed engaged

### What to ship
- Default opener for **{Segment}**: Variant B
- Variant A: retire from this segment
- Variant C: monitor — low sample size may understate it; re-test with larger N

### Specific learnings to extract
{LLM-summarized observations across the call transcripts — e.g., "Prospects respond well to specific company-fact triggers in the second sentence; generic 'I work with companies like yours' triggers immediate pushback."}

### Next steps
- Update SDR script library with Variant B as default for {Segment}
- Schedule quarterly re-test as ICP / market evolves
- Apply the winning structural pattern to neighbor segments and re-test
```

### Step 5 — Continuous evolution

Set up scheduled re-tests so the segment's default opener doesn't go stale:

- Quarterly re-test with fresh variants
- Trigger ad-hoc re-test if next-action rate on the current default drops 25%+ from baseline
- Cross-pollinate winning patterns across segments — if a "permission-first" structure wins for VPs of Engineering, test the same structure for VPs of Marketing

## What the skill explicitly avoids

- **Aggressive openers that don't move past the gatekeeper** — even if they "work" on direct dials, they damage the brand at scale
- **Manipulative scripts** — false urgency, fake referrals, social-engineering hooks. Removed regardless of conversion lift.
- **Over-personalization theater** — "I noticed you've been at {co} for 4 years and 3 months..." — measurable lift below 1% and noticeable creep factor
- **Long openers** — anything past 30 seconds is a monologue, not a call

## Edge Cases

- **Sample size insufficient** — flag the verdict as low-confidence; recommend continuing the test for 2-4 more weeks before retiring losing variants
- **All variants performed similarly** — likely the limiting factor isn't the opener; recommend running the same A/B on the post-opener portion
- **Winning variant doesn't match how reps actually talk** — flag as adoption risk; reps will silently revert. Either modify the variant to match natural rep voice or coach the variant explicitly.
- **Different reps perform differently with the same opener** — segment by rep + opener. Sometimes the right move is "Variant B for Rep X, Variant A for Rep Y" rather than one default.

## Cost

| Component | Cost |
|---|---|
| Variant generation (LLM) | ~$0.05 per segment |
| Call transcript annotation (LLM) | ~$0.02 per call |
| Per-variant scoring | Free |
| Report generation | ~$0.05 |
| **Per A/B test, 90 calls (30 per variant)** | **~$2-3** |

## Tools Required

- LLM for variant generation + transcript annotation + report
- Read access to call recordings or transcripts (Gong, Chorus, ZoomInfo Engage, or any standard format)
- Optional: integration with the SDR script library tool for auto-deploying winners

## Trigger Phrases

- "Generate opener variants for {Segment}"
- "Run the A/B on cold-call openers"
- "Which opener is winning?"
- "Build new variants for {role} prospects"
