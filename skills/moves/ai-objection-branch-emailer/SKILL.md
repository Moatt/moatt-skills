---
name: ai-objection-branch-emailer
description: Detect the objection type in an inbound reply (price, feature gap, timing, no need, competitor, security, authority) and draft a tailored response that acknowledges the objection, offers grounded evidence from your win library, and asks for a specific micro-commitment. Pairs with reply-classifier as the second step in inbound triage.
tags: [outreach]
---

# AI Objection Branch Emailer

Takes a single objection reply and produces a response email that does three things: (1) acknowledges the specific objection in the prospect's own language, (2) offers proof grounded in a real customer story or feature, and (3) asks for a low-friction next step. Each objection type has its own tactical pattern — this skill picks the right one and fills it with research.

**Built for:** Reps who default to a generic "I hear you, let me know if you change your mind" because they don't have time to research the right counter for every objection. This skill writes the counter in 60 seconds.

## When to Use

- "Draft a response to this objection"
- "Run the objection-branch on these replies"
- "Reply to this 'we already use [competitor]' email"
- "Chain `reply-classifier` → `ai-objection-branch-emailer` for objection bucket"

## Objection Types

| Type | Common signal phrases | Tactical pattern |
|---|---|---|
| `price` | "too expensive," "out of budget," "cheaper alternative" | Reframe on total cost / payback period; offer a smaller starter scope |
| `feature_gap` | "you don't have X," "we need Y" | Acknowledge gap; offer roadmap / workaround / alternate capability |
| `timing` | "not now," "next quarter," "after we finish X" | Anchor a specific re-engage date; offer low-friction interim resource |
| `no_need` | "don't need it," "we have a process," "not a priority" | Surface unrecognized cost; offer a 5-min diagnostic, not a demo |
| `competitor` | "we use X," "we evaluated and chose Y" | Acknowledge competitor strength; offer one specific differentiator + a switching-cost reframe |
| `security` | "compliance," "SOC2," "data residency," "InfoSec" | Lead with current certifications; offer a security review call with engineering |
| `authority` | "not my decision," "talk to my boss," "I'm not the right person" | Ask for warm intro; offer to brief them so they can champion internally |
| `other` | Anything that doesn't match | Fallback: ask for the specific concern, offer a 10-min call |

## Inputs

Required:
- **Reply body** — the objection message
- **Sender info** — name, title (if known), company
- **Original offer** — what the rep was selling
- **Objection type** — pre-classified (from `reply-classifier`) OR unspecified (this skill will classify)

Optional but raises quality dramatically:
- **Win library** — past customer stories, feature docs, ROI proof points (CSV, markdown, or a directory the skill can search)
- **Pricing model** — for handling `price` objections with credible reframes
- **Roadmap** — for `feature_gap` objections (when something is shipping soon)
- **Competitor battlecards** — produced by `battlecard-generator`, looked up on demand

## Workflow

### Step 1 — Confirm objection type

If the input arrives without a pre-classified type, run a quick classifier inline:
- Look for signal phrases (table above)
- If multiple types match, pick the dominant one and flag the secondary in metadata
- Confidence < 0.6 → fall back to `other`

### Step 2 — Pull grounded evidence

The response is only as good as the evidence behind it. For each objection type, retrieve:

- `price` → 1 customer with a published ROI or payback case study + 1 pricing tier the prospect could afford
- `feature_gap` → check roadmap (is X shipping?) → check workaround docs (can it be solved with current features?) → check if a similar customer adopted despite the gap
- `timing` → check for a low-commitment artifact (free assessment, scorecard, benchmark report) + a way to anchor a specific re-engage date
- `no_need` → pull a customer in the same vertical/size who said the same thing and changed their mind, with the cost they were absorbing
- `competitor` → pull the relevant battlecard via `battlecard-generator`. Pick the *one* differentiator that maps to this prospect's likely use case. Mention switching cost mitigations.
- `security` → pull current certifications (SOC2, ISO 27001, GDPR, HIPAA if relevant) + a one-line for "we can run a security review call this week"
- `authority` → identify likely senior buyer (title pattern in the same company); craft a short brief the IC can forward up

The retrieval must be *grounded* — never invent a customer name, never claim a feature exists if it doesn't. If evidence is genuinely missing, write that fact into the metadata so a human can flag it.

### Step 3 — Draft the response

Use this skeleton, swapping in the type-specific content:

```
Subject: Re: {original subject}

{First name},

{Acknowledgment line — restate their objection in their language, ≤25 words}

{Bridge — one short sentence that reframes the objection productively}

{Evidence — a single specific data point or customer story, ≤3 sentences. Names a real customer when you have one.}

{Micro-commitment ask — a low-friction next step, ≤15 words}

{Sender first name}
```

### Step 4 — Type-specific patterns

Below are the templates each branch fills. Each is a starting point — the LLM can reword for tone, but the structure should hold.

#### Price
```
{First name},

Totally fair — {your offer} is a real budget line, and stretching it without a clear payback timeline doesn't make sense.

Most teams in {their segment} hit payback in {N} weeks because {primary value driver}. {Customer name} took the same skeptical look — they ran a {X}-day pilot and saw {specific outcome}.

If a 20-minute walkthrough of their numbers would help you decide whether the math works for {their company}, I can send a calendar link.

{Sender}
```

#### Feature gap
```
{First name},

Honest answer: {feature} {is on the roadmap for {timeframe} | isn't on the roadmap | has a workaround}.

{If shipping soon}: We're shipping it {timeframe}. {Customer name} is one of the design partners — happy to put you in touch.
{If workaround}: A few customers solve this by {workaround} — not perfect, but it covers {%} of the use case.
{If no plan}: It's not on the roadmap. If that's a hard requirement, the right call is probably to keep looking.

Want a 10-minute call to see if the rest of the surface area covers what you need?

{Sender}
```

#### Timing
```
{First name},

Got it — {their timing reason} comes first.

In the meantime: {low-friction artifact, e.g., "we publish a quarterly benchmark report on {metric} that some teams use to set their {Q+1} priorities — happy to send if useful."}

When {their timing trigger} wraps up — early {month}? — would it make sense to put a 20-min call on the calendar then?

{Sender}
```

#### No need
```
{First name},

Fair — if the current process is working, switching is a tax.

The reason I asked: {peer customer in same segment} thought the same thing 18 months ago. Their unrecognized cost was {specific number} per quarter, mostly in {category}. They didn't know it until they ran a 5-minute self-diagnostic we built for that exact decision.

Want me to send the diagnostic? Worst case it tells you the current process is fine.

{Sender}
```

#### Competitor
```
{First name},

{Competitor} is a real product — they {acknowledged strength}.

The one place {your product} is meaningfully different is {single differentiator that maps to their likely use case}. {Switched-customer name} moved over for that reason and saw {outcome}. Switching cost was {realistic timeframe + level of effort}.

If you're at all open to a side-by-side on that one dimension, I can do a 15-minute walkthrough.

{Sender}
```

#### Security
```
{First name},

Good question to ask early.

Current state: {SOC2 Type II / ISO 27001 / GDPR / HIPAA — list what's actually true}. Data residency: {region options}. {One-line on encryption / SSO / audit logging if relevant}.

Happy to do a 30-minute review with our InfoSec lead this week if that helps you check the boxes faster.

{Sender}
```

#### Authority
```
{First name},

Makes sense — sounds like {likely senior title} would own this call.

Two options that have worked for similar evaluations:

1. I send you a one-page brief you can forward to {them} — covers {value, fit, what a pilot looks like}. You stay in the loop without being on point.
2. We schedule a 20-min walk-through with {them} directly, with you on the call as the technical evaluator.

Which feels right?

{Sender}
```

#### Other
```
{First name},

Want to make sure I'm reading this right — when you say {restate fragment of their objection}, the part that's blocking is {your best guess of the underlying concern}, right?

If yes — {short proposal or ask for clarification}.
If no — would a 10-minute call be the fastest way to land on what's actually in the way?

{Sender}
```

### Step 5 — Output

For each input reply, produce:

```json
{
  "id": "<reply id>",
  "objection_type": "",
  "evidence_used": ["<customer name or feature>", "..."],
  "evidence_gaps": ["<what was missing — e.g., 'no current SOC2 cert'>"],
  "subject": "Re: {original subject}",
  "body": "<final email body>",
  "micro_commitment": "<the specific ask>",
  "human_review_required": false,
  "review_reason": null
}
```

Set `human_review_required: true` when:
- Evidence gaps would force the email to be vague or untruthful
- Objection contains a personal/emotional component (frustration, anger, mention of a bad past experience with you)
- The prospect is a known executive at a tier-1 account where one bad email has reputation cost

### Step 6 — Optional: send via outreach tool

If integrated with Smartlead/Instantly/Outreach, the skill can push the drafted reply directly into the thread as a draft (never auto-send). For Gmail integration via the Gmail skill, it can place the draft into the relevant thread.

Default behavior: produce drafts only. Reps approve before send.

## Tone Guardrails

- Never say "I understand" or "I hear you" — both read as scripted.
- Never lecture. Never write more than 6 sentences total.
- Never quote their own email back at them in full. A 5-15 word fragment is enough.
- Never invent a customer or metric. If you don't have a real one, omit the evidence section and use a softer ask.

## Edge Cases

- **Multiple objections in one reply** — pick the most concrete and answer it. Acknowledge the second in one sub-clause: "And re: {second concern}, happy to come back to that on a call."
- **Hostile tone** — soften the response, drop the micro-commitment, end with "happy to come back to this when the timing fits."
- **Reply contains a question you can answer immediately** — answer the question first, in one sentence, before anything else.
- **Reply is mostly a question, not really an objection** — re-route to a Q&A handler instead of running this skill. Flag with `human_review_required: true, reason: "looks more like a question than an objection"`.

## Cost

| Component | Cost |
|---|---|
| Inline classification (if not pre-classified) | ~$0.001 |
| Evidence retrieval (RAG over win library) | ~$0.005 |
| Response generation (one model call) | ~$0.01 |
| **Total per reply** | **~$0.015** |

## Tools Required

- LLM access for classification + drafting
- Access to a win library (markdown files, Notion, Salesforce Files, Google Drive, etc.) — the skill is agnostic; it just needs a way to retrieve customer stories and feature docs
- Optional: `battlecard-generator` for `competitor` branch
- Optional: integration with the team's outreach platform for draft placement

## Trigger Phrases

- "Draft a response to this objection"
- "Run the objection branch on these replies"
- "Handle this 'too expensive' email"
- "Write me a counter to this competitor objection"
