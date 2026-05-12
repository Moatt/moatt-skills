---
name: review-intelligence-digest
description: >
  Pull G2, Capterra, and Trustpilot reviews for your product alongside the competition,
  then mine them for recurring themes, objections, proof points, and the verbatim
  language customers use for messaging. Chains review-site-scraper into LLM analysis.
  Outputs a weekly or monthly digest that drops straight into copywriting, positioning,
  and sales enablement. Reach for it when a marketing team wants to anchor messaging
  in real customer language.
tags: [research]
---

# Review Intelligence Digest

Pull reviews on your product and your closest competitors, then surface the parts that actually move marketing: exact words customers reach for, recurring pain points, proof points that convert, and objections worth pre-empting.

**Core principle:** Your sharpest marketing copy is already written — by your customers, in their reviews. This skill brings it to the surface.

## When to Use

- "What are customers saying about us against our competitors?"
- "Mine our G2 reviews for proof points and objections"
- "Which words do our customers reach for to describe the problem we solve?"
- "Run a review audit on [client]"
- "What are [competitor]'s customers complaining about?"

## Phase 0: Intake

1. Your product name plus review page URLs (G2, Capterra, Trustpilot — any/all)
2. Competitor names plus their review page URLs (1-3 competitors is a sensible range)
3. What's the learning goal? (Pick one focus or run all four):
   - **Messaging mining** — pull ICP language and proof points
   - **Competitive displacement** — identify competitor pain points to exploit
   - **Objection mapping** — uncover what's blocking purchases/renewals
   - **Feature gaps** — what features do customers wish existed?
4. Time horizon: the last 3 months (default), the last 6 months, or all time?

## Phase 1: Scrape Reviews

Fire `review-site-scraper` against your product and each competitor:

```bash
# Your product
python3 skills/capabilities/review-site-scraper/scripts/scrape_reviews.py \
  --platform g2 \
  --url "<your_g2_url>" \
  --days 90 \
  --output json

# Competitor
python3 skills/capabilities/review-site-scraper/scripts/scrape_reviews.py \
  --platform g2 \
  --url "<competitor_g2_url>" \
  --days 90 \
  --output json
```

Repeat for Capterra and Trustpilot if those sources matter.

Capture per review: rating (1-5), title, body text, pros, cons, reviewer role/company (when present), date.

## Phase 2: Categorize & Cluster

Run every review through these five lenses:

### Lens 1: Proof Points (5-star reviews)
Lift the specific outcomes and metrics customers name-check:
- Time saved / speed improvements
- Revenue or pipeline impact
- Headcount equivalent replaced
- Process improvements
- Before/after comparisons

**Flag any review that includes numbers** — those carry the highest proof-point weight.

### Lens 2: Core Pain Language
What words and phrases do customers use for the problem they had pre-product? This is gold for cold email hooks and ad copy.

Patterns worth extracting:
- "Before [product], we were..."
- "We used to [manual process]..."
- "The biggest frustration was..."
- "We couldn't [thing] until..."

### Lens 3: Objection Mapping (3-4 star reviews, negative cons)
What would customers change? What almost stopped them from buying?
- Price/value concerns
- Onboarding friction
- Missing features
- Integration issues
- Support quality

Cluster by theme. Count occurrences.

### Lens 4: Competitive Displacement Signals (competitor reviews)
Inside competitor reviews, hunt for:
- Pain points your product doesn't suffer from
- Features they lack that you offer
- Complaints about price, support, or reliability
- Switching language ("we switched to X")

That's your competitive displacement angle.

### Lens 5: Buyer Language Patterns
How do customers slot and search for your category of product?
- Which category words do they actually use?
- Which comparison phrases appear? (e.g., "compared to Salesforce", "vs HubSpot")
- What role/title wrote the reviews? (validates ICP)

## Phase 3: Output Format

```markdown
# Review Intelligence Digest — [DATE]
Products analyzed: [your product], [competitors]
Reviews analyzed: [N] total | Period: [date range]

---

## Proof Points Library (drop these into copy directly)

### With Metrics (highest value)
- "[Exact quote with number]" — [Reviewer role], [Platform], [Date]
- "[Exact quote with number]" — ...

### Process/Experience Wins
- "[Exact quote]" — [Reviewer role], [Platform]
- ...

---

## Customer Pain Language

Words and phrases customers reach for to describe the problem you solve:

**Verbatim phrases (deploy these in hooks and subject lines):**
- "[Exact phrase]" (showed up in [N] reviews)
- "[Exact phrase]" (showed up in [N] reviews)
- ...

**Paraphrased themes:**
1. [Theme] — [N] reviews touch on this | Example: "[quote]"
2. [Theme] — ...

---

## Objection Map

| Objection | Frequency | Verbatim example | How to address |
|-----------|-----------|-----------------|----------------|
| [Objection] | [N] reviews | "[quote]" | [suggested response] |
| ... | | | |

---

## Competitive Displacement Intel

### [Competitor Name]

**Top complaints (turn into outreach hooks):**
1. [Complaint] — "[Verbatim quote]" | Showed up [N] times
2. ...

**What their customers want that we already deliver:**
- [Feature/capability] — "[review evidence]"

**Suggested displacement angle:**
> "[Pitch sentence targeting their unhappy customers]"

---

## SEO / Messaging Vocabulary

Words and phrases worth threading into website copy, ads, and content:

**High-frequency ICP vocabulary:**
- "[word/phrase]" — used in [N] reviews
- ...

**Category comparison terms:**
- Customers compare you to: [list]
- Customers search for: [list]

---

## Recommended Actions

### Immediate (deploy this week)
1. Drop "[proof point quote]" onto the homepage or into outbound sequences
2. Tackle "[top objection]" inside the onboarding flow or sales deck
3. Use "[pain phrase]" as the hook in the next cold email batch

### Strategic
1. [Feature gap surfaced in reviews — prioritise or address in messaging]
2. [Competitive weakness worth a campaign of its own]
```

Save it to `review-digest-[YYYY-MM-DD].md` in the current working directory.

## Scheduling

Run on a monthly cadence (reviews don't refresh fast enough for weekly):

```bash
0 8 1 * * python3 run_skill.py review-intelligence-digest --client <client-name>
```

## Cost

| Component | Cost |
|-----------|------|
| G2 reviews (per product) | Free tier available (Apify) |
| Capterra reviews (per product) | ~$0.20-0.50 (Apify, pay-per-result) |
| Trustpilot reviews (per product) | ~$0.20/1k reviews |
| **Total per monthly run (you + 2 competitors)** | **~$1-3** |

## Tools Required

- **Apify API token** — `APIFY_API_TOKEN` env var
- **Upstream skill:** `review-site-scraper`

## Trigger Phrases

- "Mine our reviews for proof points and messaging"
- "What are [competitor]'s customers complaining about?"
- "Run review intelligence for [client]"
- "Give me customer language I can use in copy"
