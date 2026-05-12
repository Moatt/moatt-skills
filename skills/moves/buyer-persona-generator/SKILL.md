---
name: buyer-persona-generator
description: >
  Investigate a company's ideal customer segments and produce vivid synthetic buyer personas.
  Surfaces 4-6 separate buyer profiles through web research, then writes realistic personas
  with demographics, motivations, skepticism profiles, decision criteria, and language patterns.
  Use when you need a deeper view of who actually buys — what drives them, how they push back,
  and how they assess solutions.
tags: [research]
---

# ICP Persona Builder

Investigate a company's buyer segments and build out detailed synthetic personas that approximate their real customers. The personas become a durable client asset — once they exist, any downstream skill can pull them to judge messaging, content, sites, or campaigns from a buyer's perspective.

## Quick Start

```
Build ICP personas for [company]. Their site is [url].
```

When ICPs are already known:
```
Build personas for [company]. Their ICPs are: [ICP 1], [ICP 2], [ICP 3].
```

## Inputs

| Input | Required | Source |
|-------|----------|--------|
| **Company name** | Yes | User provides |
| **Company URL** | Recommended | Helps with research |
| **Known ICPs** | No | User provides, or discovered via research |
| **Client context file** | No | Any existing company context file, if available |

## Process

### Phase 1: Company Research

Get a grounded view of what the company sells and who they sell to:

1. **WebFetch their website** — homepage, product/solutions pages, pricing, "who it's for" pages
2. **WebSearch** for:
   - "[company] customers" / "[company] case studies"
   - "[company] reviews" (G2, Capterra, TrustRadius)
   - "[company] vs" (comparison searches surface buyer segments)
   - "[company] jobs" (reveals who they hire to sell or support to)
3. **Extract signals:**
   - What problem are they actually solving?
   - How are they priced/packaged? (Tells you ACV and buyer level)
   - Which industries or verticals do they sell into?
   - Which company sizes are in scope?
   - Which roles or titles appear repeatedly in case studies and testimonials?
   - What's the go-to-market model? (Self-serve, sales-led, hybrid)

### Phase 2: Identify ICP Segments

Working from the research, define **4-6 separate buyer segments**. Each should differ meaningfully from the others — a different role, different company profile, or different reason for buying.

Spec out each segment with:

| Attribute | Description |
|-----------|-------------|
| **Segment name** | Short label (e.g., "Enterprise IT Leader", "Startup Founder", "Agency Operator") |
| **Role/titles** | Typical job titles for the segment |
| **Company profile** | Size, stage, industry, tech stack |
| **Core pain point** | The #1 reason they're seeking a solution |
| **Buying trigger** | The catalyzing event that makes them start looking NOW |
| **Decision criteria** | What matters most during evaluation (ranked) |
| **Sophistication** | How deeply they understand the problem and solution landscape |
| **Alternatives** | What else they'd weigh (competitors, DIY, no-action) |
| **Segment size estimate** | Rough indication of relative size for the company (primary, secondary, emerging) |

**Diversity rules across segments:**
- At least one **technical** buyer (cares about capabilities, architecture, integrations)
- At least one **business** buyer (cares about ROI, outcomes, competitive edge)
- At least one **skeptical** profile (burned before, hard to win over)
- At least one **junior/researcher** (gathering info on behalf of a decision-maker)
- Try to span different company sizes when the company sells across tiers

### Phase 3: Build Synthetic Personas

For every segment, draft a vivid synthetic persona. The persona should read like a real, identifiable individual — not a marketing abstraction.

**Persona structure:**

```json
{
  "id": "persona-slug",
  "name": "Jordan Chen",
  "segment": "Enterprise IT Leader",
  "title": "VP of Engineering",
  "company": {
    "type": "Mid-market SaaS company",
    "size": "200-500 employees",
    "stage": "Series B, scaling fast",
    "industry": "Financial services technology"
  },
  "demographics": {
    "experience_years": 12,
    "reports_to": "CTO",
    "team_size": 35,
    "budget_authority": "$50K-200K without board approval"
  },
  "situation": "Jordan's team is growing faster than their tooling can support. They've been using a patchwork of internal scripts and are losing engineering hours to maintenance. The CTO has asked Jordan to evaluate modern solutions before next quarter's planning cycle.",
  "pain_points": [
    "Team productivity is dropping as they scale",
    "Current tools don't integrate well",
    "Onboarding new engineers takes too long"
  ],
  "buying_trigger": "CTO mandate to evaluate solutions before Q3 planning",
  "decision_criteria_ranked": [
    "Enterprise security and compliance (SOC2, SSO)",
    "Integration with existing stack (GitHub, Jira, Datadog)",
    "Scalability — will this work at 2x team size?",
    "Total cost of ownership, not just sticker price",
    "Implementation timeline — needs to be live in 6 weeks"
  ],
  "skepticism_profile": {
    "trust_level": "Low — has been burned by vendor promises before",
    "research_style": "Deep dive. Reads docs, checks GitHub issues, asks peers in Slack communities",
    "key_objections": [
      "Will this actually scale or will we outgrow it in a year?",
      "What's the real implementation cost beyond the license?",
      "How good is the support when things break at 2am?"
    ]
  },
  "technical_sophistication": "High — understands the technical landscape well, can evaluate architecture decisions, wants to see under the hood",
  "language": {
    "describes_problem_as": "We need to consolidate our toolchain and reduce operational overhead",
    "searches_for": ["engineering productivity platform", "developer tools consolidation", "[competitor] alternative enterprise"],
    "red_flag_words": ["revolutionary", "AI-powered", "seamless" — overpromising triggers skepticism],
    "trust_signals": ["SOC2 badge", "customer logos in their industry", "transparent pricing", "public changelog"]
  },
  "evaluation_behavior": {
    "first_visit": "Scans headline, checks if it's for their company size, looks for enterprise/security page",
    "deep_evaluation": "Reads docs, checks integrations list, looks for case studies from similar companies",
    "social_proof_needs": "Wants to see companies their size in their industry, not just FAANG logos",
    "deal_breakers": ["No SSO/SAML", "No self-hosted option", "Pricing only available via sales call"]
  }
}
```

### Phase 4: Save Persona Assets

Persist the personas to the client directory as reusable artifacts:

**`personas.json`** — machine-readable, with every persona in an array. Drop it in the current working directory or wherever the user prefers:
```json
{
  "company": "Acme Corp",
  "url": "https://acme.com",
  "created": "2026-02-26",
  "segment_count": 5,
  "personas": [ ... ]
}
```

**`personas.md`** — human-readable Markdown with each persona in prose form, easy to review or share.

**`segments.md`** — at-a-glance summary table of all segments and their core attributes, useful as a quick reference.

## Output Summary

Once the personas are built, present:
1. **Segment overview table** — every segment with its core attributes
2. **Persona summaries** — a 2-3 sentence recap of each persona
3. **Coverage check** — verify the diversity rules are met (technical, business, skeptical, researcher)
4. **Next steps** — suggest running `icp-website-audit` or another skill that consumes personas

## Tips

- **Research depth matters.** Spend real time in Phase 1. The more you understand the company's actual customers, the more grounded the personas. Don't stop at the homepage — work through reviews, case studies, and job listings.
- **Make personas specific.** "Marketing Manager" is too thin. "Sarah, Senior Demand Gen Manager at a 50-person B2B SaaS startup who just lost her SDR team to budget cuts" already tells you exactly how she'll evaluate a tool.
- **Don't skip the language dimension.** How a persona phrases their problem is often completely different from how the vendor phrases their solution. That gap is where messaging fails.
- **Skepticism is the highest-value trait.** Every persona needs a thought-through skepticism profile. What would push them to NOT buy? What's their default assumption about vendors?
- **No code script lives here.** It's agent-executed using WebSearch and WebFetch. The structured process above is what drives the research and persona construction.

## Dependencies

- Web search capability (for company and ICP research)
- Web fetch capability (for reading website pages)
- No API keys or paid tools required
