---
name: brand-voice-extractor
description: >
  Reverse-engineer a company's writing voice by reading 10-20 of their best published
  pieces and distilling tone, lexicon, sentence rhythm, structural habits, CTA framing,
  and reader profile into a concrete style profile. Run this before producing content,
  emails, or campaigns that need to feel native to an existing brand.
tags: [brand]
---

# Brand Voice Extractor

Pull a company's voice out of their own writing. The skill samples their strongest content, profiles the underlying patterns, and ships back guidelines you can hand to a writer (or an LLM) to keep new copy on-brand.

## Quick Start

```
Extract brand voice for [company]. Use their blog at [url].
```

When you already have an inventory of pages:
```
Extract brand voice for [client]. Use the content inventory at clients/[client]/research/content-inventory.json.
```

## Inputs

| Input | Required | Source |
|-------|----------|--------|
| **Content URLs** | Yes | Provided by user, or pulled from a prior site-content-catalog run |
| **Company name** | Yes | Used to label the output and ground the analysis |
| **Number of pages** | No | Default: 15. Upper bound for how many pieces to read. |

## Process

### Phase 1: Pick the Sample

If a URL list is handed in, use it as-is. Otherwise:

1. Open the inventory produced by `site-content-catalog`
2. Pick 10-20 pieces with deliberate variety, favoring:
   - **Blog posts** (the most honest voice signal)
   - **Landing pages** (the marketed voice)
   - **Case studies** (the storytelling register)
   - Both recent and older work (so you catch any voice drift)
   - A spread of topics (to see whether voice holds across subjects)

**Sample heuristic:**
- 8-10 blog posts, mixed across how-to, opinion, and product updates
- 2-3 landing pages — homepage, product page, solutions page
- 2-3 case studies or customer stories where available
- 1-2 comparison or vs pages if they exist

### Phase 2: Pull the Text

For every URL on the shortlist:
1. WebFetch the page
2. Isolate the main body, dropping nav, footer, and sidebar chrome
3. Record: title, URL, raw text, word count

### Phase 3: Profile the Voice

Score across the six dimensions below.

#### A) Tone
- **Formality:** Casual ↔ Professional ↔ Academic
- **Emotional register:** Excited ↔ Measured ↔ Dry
- **Authority stance:** Peer/friend ↔ Expert/teacher ↔ Institution
- **Humor usage:** Frequent ↔ Occasional ↔ None
- **Directness:** Direct/bold ↔ Hedged/diplomatic

#### B) Vocabulary & Language
- **Reading level:** Rough grade level (simple vs. complex)
- **Jargon load:** Heavy industry shorthand ↔ Plain English
- **Technical depth:** Assumes the reader knows it all ↔ Explains everything
- **Power words:** Persuasion or action verbs they favor
- **Avoided patterns:** Words or phrases they conspicuously dodge
- **Signature vocabulary:** Distinctive terms or phrases that show up repeatedly

#### C) Sentence Structure
- **Average sentence length:** Short/punchy ↔ Long/complex
- **Paragraph length:** 1-2 sentences ↔ 3-4 ↔ 5+
- **Opening patterns:** Hook of choice — question, stat, story, bold claim
- **Transition style:** How they bridge between ideas
- **Use of fragments:** Do they drop into incomplete sentences for punch?

#### D) Formatting Patterns
- **Headers:** Cadence, style (question-based, how-to, numbered)
- **Lists:** Bullets vs. numbered, frequency
- **Bold/italic:** How emphasis is deployed
- **Images/media:** Frequency, types (screenshots, illustrations, photos)
- **CTAs:** Placement, framing, frequency, language
- **Pull quotes/callouts:** Present, or absent?

#### E) Content Structure
- **Typical article length:** Short (<800), Medium (800-1500), Long (1500+)
- **Introduction style:** Hook type, length
- **Conclusion style:** Summary, CTA, open question
- **Use of data/stats:** Heavy ↔ Sparse
- **Use of examples:** Heavy ↔ Sparse
- **Storytelling:** Narrative-driven ↔ Information-driven

#### F) Persona & Audience
- **Who they write for:** Inferred reader (role, seniority, industry)
- **Assumed knowledge:** Beginner ↔ Intermediate ↔ Expert
- **Point of view:** First singular (I) ↔ First plural (we) ↔ Second (you) ↔ Third
- **Reader relationship:** Peer ↔ Teacher ↔ Service provider

### Phase 4: Write the Brand Voice Profile

Produce a Markdown document with this structure:

```markdown
# Brand Voice Profile: [Company Name]
**Analyzed:** [Date] | **Content pieces analyzed:** [N]
**Sources:** [list of URLs analyzed]

---

## Voice Summary (2-3 sentences)

[Company] writes in a [tone] voice that [description]. Their content targets
[audience] and assumes [knowledge level]. The overall feel is [adjectives].

---

## Tone Profile

| Dimension | Position | Evidence |
|-----------|----------|----------|
| Formality | [e.g., Professional-casual] | [Example quote] |
| Emotional Register | [e.g., Measured, occasionally excited] | [Example] |
| Authority | [e.g., Expert/teacher] | [Example] |
| Humor | [e.g., Rare, dry when used] | [Example] |
| Directness | [e.g., Very direct, bold claims] | [Example] |

---

## Language & Vocabulary

### Reading Level
[Grade level estimate and what that means]

### Signature Phrases
- "[phrase 1]" — used frequently to [purpose]
- "[phrase 2]" — recurring pattern in [context]

### Jargon & Technical Depth
[How much industry jargon they use, how they handle technical concepts]

### Words They Love
[List of frequently used power words, adjectives, verbs]

### Words They Avoid
[Notable absences or patterns they steer away from]

---

## Structure & Formatting

### Typical Article Structure
[Outline of how their articles are typically organized]

### Sentence & Paragraph Style
- Average sentence length: [X words]
- Typical paragraph: [X sentences]
- Notable patterns: [fragments, rhetorical questions, etc.]

### Formatting Habits
- Headers: [style]
- Lists: [frequency and style]
- Emphasis: [bold/italic patterns]
- CTAs: [where, how often, what language]

---

## Audience & Persona

### Target Reader
[Role, seniority, industry, pain points they address]

### Knowledge Assumptions
[What they assume the reader already knows]

### Point of View
[I/we/you usage and what it signals]

---

## Writing Guidelines (Actionable)

Use these guidelines when writing content, outreach, or campaigns for [Company]:

### Do
- [Guideline 1 with example]
- [Guideline 2 with example]
- [Guideline 3 with example]

### Don't
- [Anti-pattern 1]
- [Anti-pattern 2]
- [Anti-pattern 3]

### Voice Samples

**Their style:**
> [2-3 representative quotes from their content that exemplify the voice]

**How to match it:**
> [2-3 example sentences written in their voice about a neutral topic]
```

## Tips

- **Fifteen pages is the sweet spot.** Below ten and the pattern is too thin; above twenty-five and you're paying for marginal signal.
- **Lean on blog posts.** Landing pages are formulaic. Blog posts expose the actual voice.
- **Spot both consistency and inconsistency.** A dramatic tonal swing between content types is itself a finding — they may operate in multiple voice modes.
- **Look for ghostwriting.** When some posts feel like a different person wrote them, external contributors are likely. Call that out in the analysis.
- **No script ships with this skill.** It's agent-executed end to end — the AI fetches pages via WebFetch and runs the analysis directly against the output template above.

## Dependencies

- Web fetch capability (to read content pages)
- Optional: `site-content-catalog` output (helps with sample selection)
- No API keys or paid tools required
