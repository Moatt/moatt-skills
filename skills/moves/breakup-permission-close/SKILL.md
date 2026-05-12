---
name: breakup-permission-close
description: >
  Generate a final-step "breakup" email for an outbound sequence — the
  permission-close pattern that consistently outperforms most middle
  steps as the highest reply generator. Produces three variants
  (soft / direct / clever) with subject lines, calibrated to the
  prospect's role and the prior cadence context. Replaces "Just
  following up" with a respectful exit that invites a one-word reply.
tags: [outreach]
---

# Breakup Permission Close

The "breakup" email — politely closing the loop on a non-replying prospect — outperforms most middle-sequence steps as a reply generator. This skill writes the right variant for the prospect, drawing on prior cadence context, the prospect's role, and your offer. The pattern has been studied for 15+ years (Trish Bertuzzi, Outbound Squad, etc.) — what changes is making it specific.

**Built for:** Reps and SDR managers who want every sequence to end well — either with a reply that re-engages, or a clean exit that preserves the relationship for re-engagement later.

## When to Use

- "Write the breakup email for {Account}"
- "Generate the closing step for the {Sequence} cadence"
- "Final email for {Prospect} — they haven't replied"
- "Write me the permission close"

## The Three Variants

### Variant A — Soft (relationship-preserving)
Best for: enterprise prospects, named accounts, anyone you may want to re-engage in 3-12 months.

```
Subject: Closing the loop

Hi {first_name},

I've sent {count} notes the last few weeks about {topic} and haven't heard back, which usually means one of three things: bad timing, wrong person, or just not a fit.

If it's bad timing, totally fair — happy to come back when {specific re-engage trigger}.

If it's wrong person, I'd love to know who at {company} owns {topic} so I can reach out the right way.

If it's not a fit, that's fine too — I'll close the loop and stop reaching out.

Either way, thanks for the time.

{Sender}
```

### Variant B — Direct (gets a reply)
Best for: high-volume mid-market accounts where the goal is data, not relationship.

```
Subject: Removing you from my follow-up list?

{First_name},

Trying not to be the rep who keeps showing up uninvited. If I'm reading the silence right, this isn't a priority right now — totally cool.

I'll mark this one closed unless I hear back. If anything changes, you know where to find me.

{Sender}
```

### Variant C — Clever (high reply rate, risk of feeling gimmicky)
Best for: marketing/creative roles, founders, contexts where personality matters.

```
Subject: Should I take the hint?

{First_name},

If you've been hoping I'd stop, this is the email where I do.

A one-word reply works:
- "Yes" → I'll re-engage in {timeframe}
- "No" → wrong person; happy to find the right one
- "Stop" → I'll mark you closed

No reply also works — I'll close the loop on my end and move on.

{Sender}
```

Use Variant C sparingly. It's high-reply but reads as gimmicky to senior buyers and risk-averse industries (legal, finance, regulated).

## Inputs

Required:
- **Prior cadence summary** — how many touches, which channels, what topics covered, when they ran
- **Prospect** — name, role, company, vertical
- **Offer one-liner** — what was being pitched

Optional but improves quality:
- **Trigger that originally got them on the list** — for the soft variant's specific re-engage line
- **Tone preference** — `soft` / `direct` / `clever`. Default: `direct` for SDR/sales, `soft` for enterprise.
- **Sender voice** — match the rep's prior emails' voice for continuity

## Workflow

### Step 1 — Choose the variant

Default selection logic:

| Account profile | Default variant |
|---|---|
| Enterprise (>$100K target ACV) | A — Soft |
| Mid-market (<$100K, conventional vertical) | B — Direct |
| Founder / creative role / startup | C — Clever |
| Regulated industry (finance, legal, healthcare, gov) | A — Soft |
| Long-tail / high-volume sequence | B — Direct |

The user can override; the skill defaults sensibly.

### Step 2 — Personalize

For Variant A (Soft), fill in the specific re-engage trigger:

| Original trigger | Re-engage line |
|---|---|
| Funding round | "you've got a few months under the new round" |
| Hiring signal | "you're past the {role} hire's first 90 days" |
| Product launch | "{product} has had a quarter or two in the market" |
| Renewal cycle | "your {existing tool} renewal is closer" |
| Generic cold | "after Q{next quarter}" or a calendar-based trigger |

For Variant B (Direct), no specific personalization beyond name and sender style.

For Variant C (Clever), match the tone of the rep's voice as established in prior emails.

### Step 3 — Subject line A/B

Generate three subject options per variant. The reply rate varies more by subject than body for breakup emails.

| Variant | Subject options |
|---|---|
| Soft | "Closing the loop", "Last note from me on {topic}", "Should I check back later?" |
| Direct | "Removing you from my follow-up list?", "Closing the loop unless...", "Last email" |
| Clever | "Should I take the hint?", "OK to stop emailing?", "One-word reply works" |

The skill outputs all three options. Rep picks (or A/B tests).

### Step 4 — Validate

Each generated email passes:

- **Length check:** body ≤120 words. Breakup emails work because they're short.
- **No new pitch:** the body doesn't introduce a new value claim or feature. The breakup is about resolution, not selling.
- **No guilt:** banned phrases — "I'm disappointed," "I haven't heard back," "I'm sad to say." The tone is professional release, not emotional manipulation.
- **No false urgency:** banned phrases — "this is the last opportunity," "after this you'll lose access," "don't miss out." False scarcity backfires on breakup emails.
- **Clear exit:** the email must explicitly state that the rep will stop reaching out absent a reply. Without that, it's just another sequence step.

### Step 5 — Output

```json
{
  "prospect": "",
  "variant": "soft | direct | clever",
  "subject_options": ["", "", ""],
  "body": "",
  "send_time_recommendation": "Tuesday or Wednesday morning, 8-10am prospect TZ",
  "post_send_action": {
    "if_reply_yes": "remove from suppression, re-engage on the trigger date",
    "if_reply_no": "mark closed-not-fit, suppress globally",
    "if_reply_wrong_person": "mark referral, route to {referred} via new sequence",
    "if_no_reply": "mark closed-no-reply after 7 days, add to nurture list"
  }
}
```

## Send-time recommendations

Breakup emails work best when they don't compete with high-volume mailbox days:

- **Tuesday-Wednesday, 8-10am prospect timezone** — best reply rate
- **Avoid Mondays** — inbox triage day, easier to delete
- **Avoid Fridays** — easier to procrastinate
- **Avoid mid-afternoon** — meeting bog

## What "permission close" actually means

The pattern works because it gives the prospect agency — explicitly. Three ways to engage (yes / no / wrong person) all feel low-friction. Even "stop emailing me" feels like a win because they've decided. Most non-breakup sequence steps don't give the prospect a clean exit, which is why they ghost — silence is the only available response.

The "permission" framing is real: you're asking permission to stop, which paradoxically generates replies because the prospect now has a reason to engage (closure for them, too).

## Anti-patterns

- **Multiple breakup emails in a row** — defeats the entire purpose. One breakup, then mean it. If you keep emailing after the breakup, the next one isn't a breakup; it's harassment.
- **Breakup that doesn't actually break up** — body says "I'll stop reaching out" but the rep keeps the contact in the sequence. Pure damage to the brand.
- **Negotiation theater** — "If you're not interested, I'll send you my resignation letter to your team." Reads as cute, lands as creepy.
- **Re-pitching in the breakup body** — adding "but really, our product can do X for you" — signals desperation.

## Edge Cases

- **Breakup after only 1-2 prior touches** — the breakup feels premature; the prospect may not have even seen the prior emails. Default rule: at least 3-4 prior touches before the breakup. Override only with explicit reason.
- **Account is high-priority and you don't actually want to stop reaching out** — don't write a breakup. Pause, regroup, change angle, re-engage in 60 days. The breakup is a real commitment to stop.
- **Prospect is going through a public negative event (layoff, lawsuit, scandal)** — soft variant only, with a more deferential close: "Reading you might have a lot on your plate; I'll close the loop here."
- **Multiple prospects from same account** — only one breakup email per account, ever, in a 12-month window. Don't breakup with three contacts at the same company in three weeks.

## Cost

| Component | Cost per email |
|---|---|
| Variant selection logic | Free |
| Subject + body generation | ~$0.005 |
| Validation regenerations | ~$0.002 |
| **Per breakup** | **~$0.01** |

## Tools Required

- LLM for generation
- Optional: `reply-classifier` for handling the post-send replies
- Optional: prior-cadence context from sequence tool

## Trigger Phrases

- "Write the breakup email for {Account}"
- "Generate the closing step"
- "Final email — {Prospect} hasn't replied"
- "Run the permission close"
