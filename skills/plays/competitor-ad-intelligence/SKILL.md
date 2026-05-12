---
name: competitor-ad-intelligence
description: >
  Pull competitor ads from the Meta Ad Library and Google Ads Transparency Center,
  break down creative patterns (hooks, formats, CTAs), reverse-engineer the landing-page
  funnels, and ship a strategic teardown with vulnerability analysis and counter-play
  recommendations. Use when you need to understand the competitive ad landscape, find
  new creative directions, or identify weaknesses in a competitor's paid strategy.
tags: [ads]
---

# Competitor Ad Intelligence

Pull competitor ads off Meta and Google, dissect the creative patterns, reverse-engineer the landing-page funnels, and produce a full strategic teardown — hooks, formats, positioning bets, vulnerabilities, and counter-plays.

**Core principle:** A competitor's ad portfolio is a window into their growth strategy. Long-running ads reveal what converts. Newly launched ads reveal what they're testing. Landing pages reveal their positioning bets. The strongest ad creative teams start from evidence of what already works, then differentiate.

## When to Use

- "What ads are my competitors running?"
- "Tear down [competitor]'s ad strategy"
- "Find new creative angles for our paid campaigns"
- "Reverse-engineer [competitor]'s paid funnel"
- "What hooks are working in [our space]?"
- "Audit the ad landscape before we launch"
- "Find weaknesses in [competitor]'s ad strategy"
- "What format — video, image, carousel — is dominant in our category?"

## Phase 0: Intake

Gather from the user:

1. **Competitor names + domains** (e.g., `apollo.io`, `clay.run`)
2. **Your product/domain** — for the comparison framing
3. **Channels:** Meta only, Google only, or both? (default: both)
4. **Depth level:**
   - **Standard:** ad scrape + creative analysis + landing page analysis
   - **Deep:** Standard + historical comparison + funnel reconstruction + counter-plays
5. **Product category** — helps shape the analysis
6. **Known competitor landing pages?** — any URLs already spotted in their ads

## Phase 1: Scrape Meta Ads

For each competitor domain, pull ads from the Meta Ad Library.

Use `web_search` to locate competitor ads in the Meta Ad Library (publicly accessible, no API key needed):

```
web_search: site:facebook.com/ads/library "[competitor_name]"
web_search: "[competitor_name]" Meta Ad Library active ads
web_search: "[competitor_name]" facebook ads examples
```

You can also visit the Meta Ad Library directly: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=<competitor_name>`

Use `fetch_webpage` on the Ad Library URL to pull ad details when the agent supports it.

> **Note:** Apify actors for Meta Ad Library scraping exist but tend to be unreliable due to Meta's anti-scraping measures. Use `web_search` as the primary method.

**Collect per ad:**
- Ad copy (headline + primary text)
- Visual type (image / video / carousel)
- CTA button text
- Landing page URL
- Active duration (first seen, still running or stopped)
- Platforms (Facebook, Instagram, Audience Network)
- Ad variations (A/B tests — same landing page, different creative)

## Phase 2: Scrape Google Ads

For each competitor domain, pull ads from the Google Ads Transparency Center.

Use `web_search` to find competitor ads in the Google Ads Transparency Center (publicly accessible):

```
web_search: site:adstransparency.google.com "[competitor_name]"
web_search: "[competitor_name]" Google Ads transparency
web_search: "[competitor_name]" google search ads examples
```

You can also visit directly: `https://adstransparency.google.com/?search_text=<competitor_name>`

Use `fetch_webpage` on the Transparency Center URL to pull ad details when the agent supports it.

**Collect per ad:**
- Headline variants (up to 3)
- Description lines
- Ad type (Search / Display / YouTube / Shopping)
- Landing page URL
- Geographic targeting (if visible)

## Phase 3: Analyze Creative Patterns

Once every ad is collected, run structured analysis.

### Hook Pattern Clustering

Group every ad headline/opener by hook type:

| Hook Type | Pattern | Example |
|-----------|---------|---------|
| **Fear/Loss** | Risk of missing out or falling behind | "Your competitors are already using AI SDRs" |
| **Outcome** | Direct result promise | "10x your pipeline in 30 days" |
| **Question** | Challenges a current assumption | "Still doing outbound manually?" |
| **Social proof** | Names customers or numbers | "Join 500+ B2B teams using [product]" |
| **Contrarian** | Challenges conventional wisdom | "Cold email isn't dead. Your copy is." |
| **Empathy** | Validates their pain | "We know SDR ramp time is brutal" |
| **Product-led** | Feature as the hook | "[Feature] is live — see what's new" |

Count how many ads per competitor use each hook type. That reveals their dominant messaging strategy.

### Format Distribution

| Format | Meta | Google |
|--------|------|--------|
| Static image | [N] | N/A |
| Video | [N] | [N] |
| Carousel | [N] | N/A |
| Search text | N/A | [N] |
| Display banner | N/A | [N] |

### CTA Taxonomy

List every unique CTA you found. Common patterns:
- **Urgency:** "Start free", "Try now", "Get started today"
- **Low-friction:** "See how it works", "Watch demo", "Learn more"
- **Outcome:** "Book a demo", "Get your free audit", "Calculate your ROI"

## Phase 4: Landing Page & Funnel Analysis

For each unique landing page URL surfaced in the ads, fetch and analyze:

```
fetch_webpage: [landing_page_url]
```

Or use `curl` if `fetch_webpage` isn't available.

**Extract per landing page:**
- **Hero headline** — does it match the ad promise?
- **Subheadline** — value prop expansion
- **Primary CTA** — what action are they pushing? (Demo / Free trial / Sign up / Download)
- **Social proof** — logos, testimonials, case study metrics
- **Pricing visibility** — pricing shown or hidden?
- **Form fields** — how much info do they ask for?
- **Page type** — general homepage / dedicated LP / feature page / use-case page
- **Message match score** — how well does the LP deliver on the ad's promise? (1-10)

### Campaign Clustering

Group all ads into logical campaigns by:
- **Landing page destination** — ads pointing to the same URL = same campaign
- **Messaging theme** — similar copy angles = same strategic bet
- **Audience signal** — different copy for different personas

### Per-Campaign Funnel Analysis

For each campaign cluster:

| Dimension | Analysis |
|-----------|----------|
| **Strategic intent** | What is this campaign trying to do? (Awareness / Lead gen / Free trial / Competitive displacement) |
| **Target persona** | Who is this ad speaking to? (Role, pain, stage) |
| **Positioning bet** | What market position are they staking? |
| **Hook strategy** | Fear / Outcome / Social proof / Contrarian / Product-led |
| **Conversion path** | Ad → LP → CTA → [Demo call / Free trial / Content download] |
| **Longevity signal** | How long has this been running? (Longer = likely working) |
| **A/B tests detected** | Multiple creatives pointed at the same LP = active testing |

### Budget Allocation Inference

Based on ad volume and platform distribution, estimate where spend is concentrated:

| Platform | Ad Count | % of Total | Estimated Focus |
|----------|----------|-----------|-----------------|
| Meta (Facebook) | [N] | [X%] | [Awareness / Retargeting] |
| Meta (Instagram) | [N] | [X%] | [Visual / younger audience] |
| Google Search | [N] | [X%] | [Bottom-funnel capture] |
| Google Display | [N] | [X%] | [Awareness / retargeting] |
| YouTube | [N] | [X%] | [Education / awareness] |

## Phase 5: Strategic Analysis

### Creative Gap Analysis

Identify across every competitor:

1. **Angles nobody is running** — hook types absent from competitor ads = white space
2. **Overcrowded angles** — if everyone leads with "save time", avoid it or be more specific
3. **Format opportunities** — if no one is running video in your space, video may stand out
4. **Underutilized proof** — are competitors avoiding specific proof points you could own?
5. **CTA patterns to test** — what CTAs do the longest-running ads use?

### Vulnerability Analysis

Identify weaknesses in each competitor's ad strategy:

| Vulnerability Type | Description |
|-------------------|-------------|
| **Message-LP mismatch** | Ad promises one thing, LP delivers another |
| **Single-persona dependency** | All ads target the same persona — missing segments |
| **Platform concentration** | Heavy on one platform, absent from others |
| **No social proof** | Ads or LPs lack credibility markers |
| **Weak CTA** | Asking for too much too soon (demo before value) |
| **Generic positioning** | Claims anyone could make — not differentiated |
| **Stale creative** | Same ads running unchanged for months — fatigue risk |

### Historical Comparison (Deep Mode)

If Web Archive data exists for their landing pages:
- Has their positioning shifted over the past 6-12 months?
- What campaigns did they retire? (Possible losers)
- What campaigns have they scaled up? (Possible winners)

## Phase 6: Output

```markdown
# Competitor Ad Intelligence Report — [DATE]

## Coverage
- Competitors analyzed: [list]
- Meta ads collected: [N]
- Google ads collected: [N]
- Unique landing pages analyzed: [N]
- Estimated active campaigns: [N]

---

## Executive Summary

[3-5 sentence summary: What is the competitive ad landscape? What's working? Where are the gaps and vulnerabilities?]

---

## Meta Ad Analysis

### Hook Distribution
| Hook Type | [Comp1] | [Comp2] | [Comp3] |
|-----------|---------|---------|---------|
| Fear/Loss | 40% | 10% | 0% |
| Outcome | 30% | 50% | 60% |
...

### Top Performing Ads (Longest Running)
**[Competitor] — [Ad Title/Hook]**
> [Ad copy excerpt]
- Format: [type]
- CTA: [text]
- Running since: [date]
- Why it likely works: [analysis]

---

## Google Ad Analysis

### Headline Patterns
[Top headline structures with examples]

### Most Common CTAs
[ranked list]

---

## Campaign Breakdown

### Campaign 1: [Inferred Campaign Name]
- **Competitor:** [name]
- **Ads in cluster:** [N]
- **Platform(s):** [Meta / Google / Both]
- **Strategic intent:** [Awareness / Lead gen / Competitive displacement / etc.]
- **Target persona:** [Description]
- **Hook strategy:** [Type]
- **Landing page:** [URL]
  - Hero: "[Headline text]"
  - CTA: "[Button text]"
  - Message match: [Score/10]
- **Longevity:** [First seen date → status]
- **A/B tests detected:** [Yes/No — what they're testing]

**Sample ad:**
> **Headline:** [text]
> **Body:** [text]
> **CTA:** [button]
> **Format:** [Image/Video/Carousel]

**Assessment:** [1-2 sentences — is this working? Why/why not?]

### Campaign 2: ...

---

## Funnel Map

```
[Ad: Hook/Angle] → [LP: /landing-page-url] → [CTA: Book Demo]
                                               ↓
[Ad: Different angle] → [LP: /same-or-different] → [CTA: Free Trial]
```

---

## Budget Allocation Estimate

| Platform | Share | Focus Area |
|----------|-------|-----------|
| [Platform] | [X%] | [Intent] |

---

## Creative Gap Analysis

### Angles Nobody Is Running
1. [Angle] — Why it could work for you: [reasoning]
2. [Angle] — ...

### Overcrowded Angles (Avoid or Differentiate)
- [Angle] — [N] of [N] competitors use this

### Format White Space
- [Format] is not being used by competitors on [platform]

---

## Vulnerability Report

### 1. [Vulnerability]
**Competitor:** [name]
**Evidence:** [What we observed]
**Your opportunity:** [How to exploit this gap]

### 2. ...

---

## Recommended Counter-Plays

### Counter-Play 1: [Name]
- **Target their weakness:** [Which vulnerability]
- **Your ad angle:** [Hook]
- **Platform:** [Where to run]
- **Proposed headline:** "[headline]"
- **Proposed body:** "[copy]"
- **LP strategy:** [What your landing page should emphasize]
- **Why test this:** [rationale]

### Counter-Play 2: ...
```

## Cost

| Component | Cost |
|-----------|------|
| Ad library research (web_search) | Free |
| Landing page fetching | Free |
| Web Archive lookup (deep mode) | Free |
| Analysis | Free (LLM reasoning) |
| **Total** | **Free** |

## Environment Variables

- No API keys required. This skill runs on publicly accessible ad libraries and web search.

## Tools Used

- **`web_search`** — query the Meta Ad Library and Google Ads Transparency Center
- **`fetch_webpage`** or **`curl`** — fetch and analyze landing pages

## Trigger Phrases

- "What ads are [competitor] running?"
- "Tear down [competitor]'s ad strategy"
- "Audit the ad landscape for [product category]"
- "Run ad intelligence for [competitors]"
- "Find new paid ad angles we haven't tried"
- "Reverse-engineer [competitor]'s paid funnel"
- "Find weaknesses in [competitor]'s ad strategy"
- "Deep competitive ad analysis on [competitor]"
