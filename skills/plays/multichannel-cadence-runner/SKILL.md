---
name: multichannel-cadence-runner
description: >
  Build and orchestrate a 4x8 multichannel cadence (email + LinkedIn DM +
  LinkedIn voice note + cold call) over 8 business days, with each step
  personalized using prior-channel context. Each step's content adapts
  based on whether the prospect engaged in the prior step. Outputs the
  full per-prospect cadence ready for push to Smartlead/HeyReach/etc.
  with sender rotation suggestions.
tags: [outreach]
---

# Multichannel Cadence Runner

Single-channel outreach is dying. Modern outbound runs across email + LinkedIn + voice note + call, with each touch referencing the prior. This skill takes a list of prospects and produces the full cadence — every channel, every step, every day — personalized at the row level. Designed to feed Smartlead (email), HeyReach (LinkedIn), and the rep's calendar (calls) as a coordinated push.

**Built for:** SDR/AE teams running 50+ accounts a week who want the cadence quality of a 1:1 motion at scale.

## The cadence

Default 4x8 pattern (4 channels, 8 business days). Days are business days, not calendar days — skip weekends and holidays.

| Day | Channel | Step | Notes |
|---|---|---|---|
| 1 | Email | E1 — first touch with personalized opener | Persona-on-the-fly hook |
| 2 | LinkedIn | LI1 — connection request with note | References E1 lightly |
| 4 | LinkedIn | LI2 — voice note (if connected) OR DM (if not yet accepted) | 30-45 sec |
| 6 | Email | E2 — second touch, references LinkedIn voice/DM | "Following up on what I said in LinkedIn..." |
| 8 | Email + Call | E3 + cold call same day | Permission close on email; call queued in rep dashboard |

The pattern is configurable per ICP segment. Tier-1 accounts get an extended 12-day cadence with a video-message touch. Tier-3 accounts get a compressed 5-day email-only push.

## When to Use

- "Build the cadence for {Campaign} batch"
- "Generate the full sequence for these prospects"
- "Wire up email + LinkedIn for {Account list}"
- "Create the multichannel push for {ICP segment}"

## Inputs

Required:
- **Prospect list** — enriched CSV with: name, email, LinkedIn URL, phone (optional), company, role, plus any signals fired
- **Campaign offer** — what the rep is selling, in one sentence
- **Sender(s)** — one or more reps. If multiple, the cadence rotates senders per account to create the "surround sound" effect.

Optional but improves quality:
- **Tier per prospect** (1-3) — controls cadence length and personalization depth
- **Trigger context** per prospect — what signal got them on the list (funding, hiring, news, intent)
- **Customer references** — for case study insertion via `prospect-case-study-matcher`
- **Time zone** — for send-time optimization

## Workflow

### Step 1 — Plan the cadence

For each prospect, decide cadence variant based on tier:

| Tier | Channels | Days | Personalization depth | Sender |
|---|---|---|---|---|
| 1 (top) | Email + LinkedIn + voice note + video + call | 12 days | Full account brief informs every step | Senior AE or original rep |
| 2 (mid) | Email + LinkedIn + voice note + call | 8 days | Persona-on-the-fly + one fact per step | SDR |
| 3 (long-tail) | Email + LinkedIn DM + email | 5 days | Persona-on-the-fly opener; lighter follow-ups | SDR or AI-augmented |

The skill produces one block per prospect with all steps pre-rendered.

### Step 2 — Generate Step 1: Email (E1)

**Skill:** `persona-on-the-fly-emailer` (existing) for the opener; `email-drafting` (existing) for the full email.

Structure:
```
Subject: {short, ≤6 words, references the trigger or fact}

{Persona-on-the-fly opener — 1 sentence}

{Bridge — 1 sentence connecting the fact to a problem your offer solves}

{Value claim — 1 sentence with a specific outcome metric}

{Micro-commitment — 1 sentence asking for a low-friction next step}

{Sender}
```

### Step 3 — Generate Step 2: LinkedIn connection request (LI1)

`linkedin-message-writer` (existing). Connection request notes are capped at 300 chars.

Pattern:
```
Hi {first_name} — sent you a quick note re: {topic from E1, 3-5 word fragment} earlier today. Open to connecting either way; happy to share the {specific resource} when you have a sec.
```

Why it works:
- References the email without forcing the prospect to read it again
- Doesn't pitch — the connection request is for connecting, not selling
- Offers a small resource as the connection benefit

### Step 4 — Generate Step 3: LinkedIn voice note OR DM (LI2)

If the connection request was accepted by Day 4: send a 30-45 second voice note with a script.
If not accepted: send a follow-up DM (open profile DM if InMail credits allow; else InMail).

Voice note script template:
```
Hey {first_name}, {sender first name} here.

Quick voice note instead of typing — I sent over the {topic} stuff earlier this week. The reason I picked you specifically: {one-sentence trigger / signal}.

What I usually find with {role-segment}s in your space is {one-line pain hypothesis}. If that's at all close to what's on your radar, I'd love 15 minutes to compare notes — happy to set something up.

Either way, I appreciate the connection. Talk soon.
```

The skill outputs the script + a recording instruction (length, pace, tonal notes) for the rep. It doesn't auto-record; that's a human step.

### Step 5 — Generate Step 4: Email (E2)

Pattern: "Following up on the LinkedIn note I left — wanted to reground on..."

```
Subject: Re: {original subject}  (or fresh subject for variety)

{First name},

Wanted to follow up on the {voice note / connection note} from earlier in the week.

The thing I'd most want to share with someone in your seat is {one specific artifact — a benchmark, a customer outcome, a teardown}. {Customer reference one-liner via prospect-case-study-matcher.}

Worth a 20-minute look at how that mapped for them?

{Sender}
```

### Step 6 — Generate Step 5: Email + cold call (Day 8)

The final email is a permission close. Same day, the rep places a cold call.

Email pattern:
```
Subject: closing the loop on {topic}

{First name},

I've reached out a few times — wanted to make sure this didn't slip through.

If the timing isn't right, totally fair — happy to come back when {trigger condition}.
If you'd rather just see the {one specific resource}, reply with "yes" and I'll send.

Either way, I'll stop reaching out from here.

{Sender}
```

Cold call script:
```
Opener: "{First name}? Hey, this is {sender}. I'll be brief — sent you a few notes the past week about {trigger / pain}. Probably caught at a bad time?"

If they engage: standard discovery questions
If they push back: "All good, won't keep you. Worth one quick question — is {pain hypothesis} a 2026 priority on your end? If yes, I'll re-engage in a couple of months. If no, I'll stop reaching out."
```

### Step 7 — Assemble per-prospect cadence file

For each prospect, output:

```markdown
# Cadence: {Prospect name} @ {Company}
**Sender:** {rep name}
**Tier:** {1/2/3}
**Trigger:** {what got them on the list}
**Start date:** {Day 1 ISO date}

---

## Day 1 (Mon, {date}) — Email
**Subject:** {subject}
**Body:**
{full email}

## Day 2 (Tue, {date}) — LinkedIn connection request
**Note:**
{connection note}

## Day 4 (Thu, {date}) — LinkedIn voice note
**Script:**
{voice note script}
**Recording notes:** 30-45 sec, conversational pace, {tonal notes}

## Day 6 (Mon, {date}) — Email
**Subject:** {subject}
**Body:**
{full email}

## Day 8 (Wed, {date}) — Email + Call
**Email subject:** {subject}
**Email body:**
{full email}

**Call script:**
{call script}

---

## Personalization sources (for the rep to verify)
- {Source 1 with URL}
- {Source 2 with URL}
- {Source 3 with URL}
```

### Step 8 — Push to delivery tools

The skill outputs in the formats each delivery tool expects:

- `smartlead-import-{date}.csv` — for email steps, with custom variables for personalization
- `heyreach-import-{date}.csv` — for LinkedIn steps
- `call-queue-{date}.csv` — for the call dashboard
- `rep-briefs-{date}/` — one markdown file per prospect for the rep's daily prep

### Step 9 — Sender rotation (multi-sender campaigns)

If multiple senders are configured (the "surround sound" play where 2-3 reps reach into the same account at different stakeholders), the skill assigns:
- Each prospect to a primary sender for the email cadence
- A different sender for the LinkedIn touch
- The "echo" sender's content references the primary's: "I saw {primary} reached out to {colleague} re: {topic}; wanted to add my $0.02..."

This creates the perception of independent inbound interest from your team rather than one rep blasting.

## Step Adaptation Rules

The cadence isn't static. Each step adapts based on prior signals:

- **Email opened, no reply** → next step references the open implicitly via timing ("circling back...")
- **Connection request accepted** → voice note path; reference the connection in E2
- **Connection request not accepted by Day 4** → switch to InMail or skip LinkedIn voice; double down on email
- **Reply received** → the cadence pauses; route to `reply-classifier` to decide next action
- **Bounce on email** → skip remaining email steps, escalate LinkedIn intensity, find alternate contact at the same company

## Anti-patterns

- **Same email twice** — every step has unique content, never copy-paste
- **Generic LinkedIn DMs** — every DM references prior context (E1 topic or fact)
- **Calls without prior touches** — the call works because of the prior 7 days of context. Cold-cold calls are not what this cadence does.
- **Same sender across all steps when multi-sender is configured** — defeats the "surround sound" effect

## Cost

| Component | Cost per prospect |
|---|---|
| Persona opener generation | ~$0.01 |
| Email drafting (3 emails) | ~$0.02 |
| LinkedIn note + voice script + DM | ~$0.01 |
| Call script | ~$0.005 |
| Case study matching | ~$0.005 |
| **Per prospect, full cadence** | **~$0.05** |

Per 100 prospects: ~$5. Versus 8+ hours of rep time per 100 well-personalized cadences, this is roughly 100× cheaper.

## Tools Required

- `persona-on-the-fly-emailer` (Wave 2)
- `linkedin-message-writer` (existing)
- `email-drafting` (existing)
- `prospect-case-study-matcher` (Wave 2)
- LLM for assembly + adaptation logic
- Delivery-tool exports (Smartlead, HeyReach formats; both are CSV)

## Trigger Phrases

- "Build the cadence for {Campaign}"
- "Generate the full sequence for these prospects"
- "Wire up email + LinkedIn for {batch}"
- "Run the multichannel runner"
