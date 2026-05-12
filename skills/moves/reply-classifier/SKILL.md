---
name: reply-classifier
description: Classify inbound replies to cold email or LinkedIn outreach into nine intent categories — positive interest, objection, wrong person, out of office, unsubscribe, refer to colleague, ask for resources, ghost, or already a customer — with a confidence score, an extracted summary line, and a recommended next action per reply.
tags: [outreach]
---

# Reply Classifier

Reads a batch of inbound replies and assigns each one a single intent category, a confidence score, a one-sentence summary of what the prospect actually said, and a recommended next action. Designed to run in front of any sequencing tool (Smartlead, Instantly, Lemlist, Outreach, Salesloft, plain Gmail) so SDRs/AEs spend their day on the replies that matter.

**Built for:** Outbound teams whose reps spend 30-60 minutes per day triaging inboxes — opening, reading, deciding what to do — and want that work cut to under 10.

## When to Use

- "Triage today's replies"
- "Sort these inbound replies into action queues"
- "What replies need a meeting booked vs. a polite close?"
- "Find me the positive replies in my Smartlead unified inbox"
- "Classify these LinkedIn DMs by intent"

## Inputs

Required:
- **Replies** — a CSV, Smartlead/Instantly export, Gmail thread export, or pasted blob. Each reply needs at minimum: sender name, sender email, reply body. Subject and original outbound thread (if available) sharply increase accuracy.

Optional but recommended:
- **Original sequence context** — the email the prospect replied to, plus the prospect's known title/company. Lets the classifier judge "wrong person" cleanly.
- **Sender's offer one-liner** — what the rep was actually selling. Lets the classifier distinguish "I already use X" from "Send me more info."

## The Nine Categories

| Category | Definition | Default next action |
|---|---|---|
| `positive_interest` | Prospect indicated willingness to talk, learn more, see a demo, or take a meeting. | Book meeting / route to AE |
| `objection` | Prospect raised a specific concern (price, feature gap, timing, security, "not now") but is engaged. | Route to objection-handler |
| `wrong_person` | This isn't the right buyer. Could be IC who can't approve, retired, in a different department. | Find correct buyer + warm intro request |
| `refer_to_colleague` | Prospect explicitly named someone else to reach out to. | Send to named contact, mark this thread as referral |
| `out_of_office` | Auto-reply or vacation message. | Re-queue for OOO end date |
| `unsubscribe` | Explicit opt-out, "remove me," "stop," "do not contact." | Suppress across all sequences immediately |
| `ask_for_resources` | Prospect wants a deck, pricing PDF, case study, or spec without a call. | Send asset, set follow-up reminder |
| `already_a_customer` | Prospect (or their company) is already a paying customer. | Suppress + alert CSM/AM |
| `ghost` | Reply was a non-answer — "thanks," confused, off-topic, or only a signature. Inconclusive. | Standard sequence continues |

Always pick exactly one category. Tie-break rule: `unsubscribe` > `already_a_customer` > `wrong_person` > `out_of_office` > `objection` > `positive_interest` > `refer_to_colleague` > `ask_for_resources` > `ghost`.

## Workflow

### Step 1 — Parse the input

Accept any of these formats:
- CSV with columns including `from`, `subject`, `body` (or `reply_text`, `message`, etc. — be lenient)
- Smartlead/Instantly raw JSON export
- Gmail thread paste (RFC822-style headers + body)
- Free-text paste of multiple replies separated by `---` or `From:` lines

Normalize each reply to:

```json
{
  "id": "<stable hash of from+subject+body>",
  "from_name": "",
  "from_email": "",
  "subject": "",
  "body": "",
  "received_at": "",
  "original_offer": "<from sender_offer if provided>",
  "original_thread": "<from optional context if available>"
}
```

Strip email signatures, quoted prior messages (lines starting `>` or after "On <date> wrote:"), and HTML noise before classification.

### Step 2 — Classify each reply

For each normalized reply, run an LLM classification with this structure:

**System role:** You are an SDR triage assistant. Classify the reply into exactly one of the nine categories above. Return JSON only, no commentary.

**User payload:**
```
ORIGINAL OFFER (what the rep sent): {original_offer or "unknown"}
PROSPECT TITLE/COMPANY: {if available}
SUBJECT: {subject}
BODY: {body}

Return:
{
  "category": "<one of the nine>",
  "confidence": 0.0-1.0,
  "summary": "<one sentence — what the prospect actually said in their words, paraphrased>",
  "key_phrase": "<verbatim 5-15 word quote that drove the classification, or null>",
  "next_action": "<recommended next step>",
  "objection_type": "<if category=objection: price | feature_gap | timing | no_need | competitor | security | authority | other; else null>",
  "referred_to": "<if category=refer_to_colleague: name + email/role if mentioned; else null>",
  "ooo_until": "<if category=out_of_office and a return date is mentioned: ISO date; else null>"
}
```

### Step 3 — Apply tie-break + sanity checks

After the model returns, run these post-checks per reply:

1. **Hard unsubscribe check** — if body contains any of: "unsubscribe", "remove me", "stop emailing", "opt out", "do not contact" — force category to `unsubscribe` regardless of model output.
2. **Hard OOO check** — if subject starts with "Out of office", "OOO", "Auto-reply", "Automatic reply" — force category to `out_of_office`.
3. **Existing-customer check** — if body contains "already a customer", "we use [your product]", "we're on [your product]" — force `already_a_customer`.
4. **Confidence floor** — if `confidence < 0.5`, downgrade category to `ghost` and flag for human review.
5. **Refer extraction** — if category is `refer_to_colleague` and `referred_to` is null, run a second pass to extract the named person from the body.

### Step 4 — Output

Produce both a CSV and a per-bucket summary.

#### CSV columns

```
id, from_name, from_email, subject, received_at,
category, confidence, summary, key_phrase, next_action,
objection_type, referred_to, ooo_until
```

#### Per-bucket summary

```markdown
## Reply Triage — {DATE}, {TOTAL} replies

| Category | Count | Action queue |
|---|---|---|
| Positive interest | {N} | Book meetings — {N} routed to AE |
| Objection | {N} | Handle objections — top type: {top objection type} |
| Wrong person | {N} | Find correct buyer ({M} have explicit referrals) |
| Refer to colleague | {N} | Reach out to named contact |
| Ask for resources | {N} | Send asset + follow-up reminder |
| Already a customer | {N} | Suppress + alert CSM ({list of accounts}) |
| Out of office | {N} | Re-queue ({M} have specific return dates) |
| Unsubscribe | {N} | Suppress globally — done |
| Ghost / inconclusive | {N} | Sequence continues |

### Top positive replies (sorted by confidence)
- **{Name}** ({Company}) — "{summary}" [next: book meeting]
- ...

### Objections by type
- Price: {N} → run `ai-objection-branch-emailer` on this slice
- Feature gap: {N} → ...

### Compliance flags
- Unsubscribes to suppress: {list of emails}
- Existing customers to alert: {list of accounts + likely CSM}
```

### Step 5 — Suggested handoffs

The output is designed to feed downstream skills:

- `positive_interest` rows → calendar booking flow
- `objection` rows → `ai-objection-branch-emailer` for tailored responses
- `wrong_person` + `refer_to_colleague` rows → enrichment + new-contact outreach
- `already_a_customer` rows → CSM alert + sequence suppression
- `unsubscribe` rows → `crm-suppression-sync` (or whatever your suppression mechanism is)

## Calibration

The first time you run this for a client, sample 30 classifications and have a human grade them. Use the resulting precision/recall to:

- **Tune `confidence` floor** — if too many `ghost` results are actually positives, lower the floor.
- **Refine the offer one-liner** — most misclassifications come from the model not knowing what the rep was selling.
- **Add custom hard-rules** — every team has a few client-specific patterns ("we already evaluated you in 2024" = `objection: timing`, not `already_a_customer`).

## Edge Cases

- **Multi-reply threads** — only classify the latest message in the thread, not the whole conversation. Older replies in the thread go in as context but the category reflects the most recent intent.
- **Forwards** — when a prospect forwards your email to someone else with no commentary, classify as `refer_to_colleague` with the forwarded-to address as `referred_to`.
- **One-word replies** — "Yes." → `positive_interest` (high confidence). "No." → `objection: no_need`. "Maybe." → `ghost` with note for human review.
- **Auto-replies that look positive** — "Thanks for reaching out, I'll get back to you" can be either real interest or boilerplate. If sent within 60 seconds of the original send, classify as `out_of_office` (auto-reply).
- **Non-English replies** — translate, classify, and add `original_language` field.

## Cost

| Component | Cost |
|---|---|
| LLM classification (per reply) | ~$0.001 with a small model |
| Hard-rule post-checks | Free |
| Output formatting | Free |
| **Total for 1,000 replies** | **~$1-2** |

## Tools Required

- LLM access (any modern small model handles this — Haiku/GPT-4o-mini/etc. are fine)
- Read/Write — for CSV input/output

## Trigger Phrases

- "Triage today's replies"
- "Classify these inbound replies"
- "Sort my Smartlead inbox by intent"
- "Run the reply classifier"
- "What's in my reply queue today?"
