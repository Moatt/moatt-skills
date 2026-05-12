---
name: champion-departure-trigger
description: >
  Detect when a champion (current customer, past buyer, or known stakeholder)
  leaves their company, then fire two parallel plays: (1) re-engage the
  remaining account to re-establish executive sponsorship and protect
  retention; (2) reach out to the departed champion at their new company
  as a warm expansion lead. Combines LinkedIn job-change detection,
  CRM cross-reference, and personalized outreach generation.
tags: [outreach]
---

# Champion Departure Trigger

The single highest-yield outbound play that costs almost nothing to run: when someone who already loves your product moves to a new company, they take their preferences with them. Existing peer-reviewed research (UserGems, Sendoso, etc.) consistently shows 60-80% conversion from "champion-at-new-company" outreach into pipeline within 90 days. This skill detects the trigger and runs both sides — protect the original account, pursue the new one.

**Built for:** Customer-success and sales teams that don't have a paid champion-tracking tool yet, plus anyone who has one but wants higher-quality outreach generation behind it.

## When to Use

- "Run the champion departure scan"
- "Track champion job changes for our customer base"
- "Did any of our past champions move companies recently?"
- "Find expansion leads from departed users"

## Phase 0: Intake

Required (one-time setup):
- **Champion list** — list of people to monitor. Source priority:
  1. CRM contacts on closed-won deals (current customers)
  2. CRM contacts on closed-lost deals where notes say "champion left"
  3. Past free-tier power users (if PLG)
  4. Conference speakers or community members in your category
  
  Each entry needs: name, current company, current title, LinkedIn URL, original deal/relationship context

- **Watch cadence** — daily / weekly / monthly. Default: weekly.
- **Outreach senders** — who pursues the departed champion (typically the original AE), and who re-engages the remaining account (typically CSM)

Optional but raises quality:
- **CRM integration** — to look up the original deal context and current account status
- **Customer base for cross-reference** — to detect when a departing champion lands at an *existing customer* (different play entirely — pure expansion, no cold outreach needed)

## Phase 1: Detect departures

Run on cadence. For each champion in the list:

### 1A — Current state check
- Skill: `linkedin-profile-post-scraper` (existing)
- Pull current company + title from LinkedIn
- Compare against last-known company + title
- Departure detected when:
  - Current company ≠ last-known company, OR
  - Current title is dramatically different and time-since-last-update > 30 days (indicates job change at same company that may signal departure)

### 1B — Confirm with second source
False positives waste outreach. Confirm with:
- Recent post check ("excited to share I'm joining {new co}", "after {N} years at {old co} I'm moving to..." patterns)
- Their company page no longer lists them
- They removed the company from their LinkedIn

Two corroborating signals = high-confidence departure.

### 1C — Output detection record

```json
{
  "champion_id": "<id>",
  "name": "",
  "previous_company": "",
  "previous_title": "",
  "previous_role_tenure_months": 0,
  "new_company": "",
  "new_title": "",
  "new_company_domain": "",
  "departure_detected_at": "",
  "confidence": "high | medium | low",
  "evidence": ["<each corroborating signal>"],
  "original_relationship": "<closed-won deal in 2024 | closed-lost in 2023 | community member | etc>"
}
```

## Phase 2: Cross-reference

### 2A — New company match against customer base
If new company is already a customer:
- This is the highest-leverage scenario: a known champion now sits inside an existing account
- Flag as `internal_expansion_lead`
- Output: brief CSM/AE on the relationship; suggest a warm intro to expand seats/scope. No cold outreach needed.

### 2B — New company match against active opportunities
If new company is in active pipeline (not yet customer):
- The departed champion may now be the warm path forward
- Flag as `pipeline_warm_inject`
- Brief the AE owning the deal; recommend a warm reach-out from the original AE

### 2C — New company is net-new
- Flag as `cold_warm_lead` (departed champion at fully new company)
- Standard outreach play: original AE reaches out warmly

### 2D — New company match against competitors / suppression list
- Flag as `do_not_pursue` and stop. The skill won't generate outreach to a competitor employee.

### 2E — Original account: evaluate retention risk
For every departure regardless of where they went:
- Pull current account status (active customer / paying / health score)
- Departed champion was the primary user/decision-maker → high retention risk
- Departed champion was a secondary stakeholder → moderate
- Departed champion was on a closed-lost deal → no retention risk, ignore

## Phase 3: Generate outreach (two parallel plays)

### Play A — Re-engage the original account

If the departed champion was at a current customer:

**Output 1: CSM internal note**
```markdown
## Champion Departure: {Champion name} left {Account}

**Risk level:** High / Medium / Low (based on their role)
**Their tenure with us:** {duration}
**Original deal context:** {summary from CRM}
**Current account status:** {plan, MRR, health score, renewal date}

### Recommended actions
1. **Within 48h:** {CSM} sends a "we hear you" email to remaining account contacts ({list}), offering a transition call.
2. **Within 7 days:** Schedule executive check-in to identify the new champion / sponsor.
3. **Before renewal ({date}):** Document the new sponsor. Account is at-risk until that's done.

### Replacement champion candidates
Based on org chart and remaining contacts:
- {Name 1, title} — {why they're a candidate}
- {Name 2, title} — {why}
```

**Output 2: Email draft to remaining account contacts**
```
Subject: Quick check-in on {Account} now that {Departed Champion} has moved on

Hi {remaining contact},

Saw {Departed Champion's first name}'s announcement — congrats to them, and a bit of a moment for us too. {Departed champion} has been our primary point of contact for {duration}.

I want to make sure the transition is smooth on your end. {1-2 things they were driving with us, in concrete terms.}

Could we schedule 20 minutes in the next week or two? I'd like to:
- Make sure I understand who's now picking up {their work} on your side
- Walk through where things stand with {your account}
- Answer any questions about {specific thing they cared about}

Let me know what's open in your calendar.

{CSM signature}
```

### Play B — Pursue at the new company

**Output: Original AE outreach to departed champion at new role**

The opener cannot read like a cold email. They knew you. The angle is: "I saw you joined {new co}, congrats — wanted to ask about how {familiar product} fits into what you're building over there."

```
Subject: Congrats on {New Co} — quick thought on what worked at {Previous Co}

Hi {first name},

Saw you joined {new co} as {new title} — congrats. That's a great spot for someone with your background.

Since I have your attention: at {previous co}, you used {our product} for {specific outcome they got}. Curious whether {new co} has anything in motion around {category}. Three reasons I'm asking:

- {New co} has {fact about new company suggesting fit — e.g., recently raised, scaling team, public statement about priority area}
- The folks I work with at companies like {new co}'s size tend to hit {pain X} around month 6-12 of a {role like theirs}
- You already know {our product} works for {specific use case} — getting started somewhere new is way faster the second time

Would 15-20 minutes make sense once you're past the first month and have a feel for what's actually broken?

{Original AE signature}
```

The "three reasons" structure works because:
1. It signals you researched the new company (not generic)
2. It frames the offer in their new role's language (not yours)
3. It acknowledges the relationship asymmetry — you're the seller, they're a busy new VP, and you're not pretending otherwise

### Sequencing
- Send the original-account play *first* (within 48h of detection). Don't let the departed champion outreach trigger before the customer-side recovery.
- Wait 14 days after the champion's start date at the new company before reaching out to them. Give them time to settle.
- Limit to ONE re-engage attempt + ONE follow-up at the new company. This is a high-trust play; don't burn it with sequences.

## Phase 4: Track outcomes

For each detected departure, log:

```json
{
  "departure_id": "",
  "detected_at": "",
  "play_a_status": "sent | replied_positive | replied_neutral | no_reply | account_renewed_smoothly | account_at_risk | account_churned",
  "play_b_status": "sent | replied | meeting_booked | opportunity_opened | closed_won | closed_lost | no_reply",
  "expansion_revenue_attributed": 0,
  "retention_outcome": "saved | downgraded | churned | renewed_normally"
}
```

This is your highest-ROI top-of-funnel signal — track it like a campaign.

## Phase 5: Recurring run

The skill is meant to run on a schedule. Each run produces:

```markdown
## Champion Departure Scan — {date}

**Champions monitored:** {N}
**New departures detected:** {M}
**Confidence breakdown:** {N high | M medium | K low}

### High-confidence departures requiring action
1. **{Name}** — {previous co} → {new co} ({new title})
   - Previous relationship: {context}
   - Plays triggered: A (re-engage {previous co}), B (pursue at {new co})
   - Output drafts saved to: {paths}
2. ...

### Internal expansion leads (champion now at existing customer)
1. **{Name}** — now at {customer co}, role {title}
   - Suggested action: Brief {CSM/AE owning customer co} for warm intro

### Medium-confidence — verify before sending
1. ...

### Skipped (competitor / suppression / low confidence)
1. ...
```

## Edge Cases

- **Champion went to a competitor** — automatic suppress. Don't pursue, don't send anything.
- **Champion moved to a board / advisor role, not operational** — flag as `not_operational`. Outreach pattern is different (it's a relationship-maintenance touch, not a pipeline play).
- **Champion took a step down (sabbatical, smaller role, IC)** — proceed with Play B but with adjusted tone; don't lead with "great new role" if it's a step down. The skill detects this from title seniority comparison.
- **Champion left to start their own company** — high-leverage scenario. Adjust Play B to acknowledge the founding move; offer founding-customer pricing if your team supports it.
- **Multiple departures from same account in same month** — flag as `account_destabilizing`. Skip Play B until the account-side picture stabilizes; focus on the urgent retention play.

## Cost

| Component | Cost per detected departure |
|---|---|
| LinkedIn profile scrape | ~$0.10 |
| New-company intel | ~$0.10 |
| CRM cross-reference | API-dependent |
| Outreach draft generation (both plays) | ~$0.05 |
| **Total per champion change** | **~$0.30** |

Scanning 500 champions weekly: ~$150 in monitoring + per-detection costs. Typical detection rate: 1-3% of monitored champions per quarter, so ~$50/month total at this list size. Pipeline impact: a single converted warm lead pays for the whole year.

## Tools Required

- `linkedin-profile-post-scraper` (existing)
- `company-contact-finder` (existing)
- `company-intel` (existing)
- CRM read access for cross-reference + customer status
- LLM for outreach drafting
- Optional: `signal-scanner` (existing) for orchestration / scheduling

## Trigger Phrases

- "Run the champion departure scan"
- "Track champion job changes"
- "Find expansion leads from departed users"
- "Did any past champions just move companies?"
