---
name: newsletter-sponsorship-finder
description: >
  Find newsletters that reach a target audience or industry for sponsorship
  opportunities. Discovers newsletters via web search, newsletter directories,
  and industry research. Returns newsletter name, author, estimated audience,
  topic focus, sponsorship rates (when available), and contact info.
---

# Newsletter Sponsorship Finder

Find and rank newsletters for sponsorship opportunities matching a specific ICP. Combines web search, newsletter directories, and competitor intelligence to build a prioritized list of sponsorship targets.

## Quick Start

```
Find newsletter sponsorship opportunities for [client]. Target audience: [description]. Industry keywords: [keywords].
```

Or with optional filters:

```
Find newsletter sponsorship opportunities for [client].
Target audience: CTOs and DevOps engineers at startups.
Industry keywords: cloud, AWS, DevOps, infrastructure, FinOps.
Budget: $500-2000/placement.
Geographic focus: US.
```

## Inputs

- **Target audience description** (required) — e.g., "CTOs and DevOps engineers at startups"
- **Industry keywords** (required) — e.g., "cloud, AWS, DevOps, infrastructure, FinOps"
- **Budget range** (optional) — for filtering newsletters by sponsorship cost
- **Geographic focus** (optional) — e.g., "US", "Europe", "Global"
- **Output path** (optional) — where to save results, defaults to `clients/<client>/leads/newsletter-sponsorships-YYYY-MM-DD.md`

## Cost

Free — all discovery runs through WebSearch. No API keys required.

## Dependencies

```
pip3 install requests
```

Optional helper script for Substack directory search:

```bash
python3 skills/newsletter-sponsorship-finder/scripts/search_newsletters.py --keywords "cloud,AWS,DevOps" --output json
```

## Process

### Phase 1: Define Target

Accept from the user:
- Target audience description (e.g., "CTOs and DevOps engineers at startups")
- Industry keywords (e.g., "cloud, AWS, DevOps, infrastructure, FinOps")
- Budget range (optional, for filtering)
- Geographic focus (optional)

### Phase 2: Discovery (run searches in parallel)

#### A) Direct newsletter search (WebSearch)

Run these searches:
- `"[industry] newsletter"`
- `"[industry] weekly newsletter developer"`
- `"best newsletters for [target audience]"`
- `"[industry] newsletter sponsorship"`
- `"advertise in [industry] newsletter"`

#### B) Newsletter directory search

Search Swapstack/Paved/SparkLoop for relevant newsletters:
- `"site:swapstack.co [industry]"`
- `"site:paved.com [industry]"`
- WebFetch on directory result pages to find listings in the target niche

#### C) Industry-specific discovery

- Search for `"[industry] blog"` and `"[industry] content creator"` — most likely also run newsletters
- Search for `"[industry] newsletter" site:linkedin.com` posts
- Search for Substack newsletters: `"site:substack.com [industry keywords]"`
- Optionally run the helper script: `python3 skills/newsletter-sponsorship-finder/scripts/search_newsletters.py --keywords "[keywords]" --output json`

#### D) Competitor sponsorship research

- Search `"[competitor name] sponsor newsletter"` or `"[competitor name] advertise"`
- Inspect competitor sites for "As seen in" or press pages
- This reveals which newsletters competitors already sponsor (validated audience match)

### Phase 3: Enrich Each Newsletter

For each discovered newsletter, use WebFetch on the newsletter page and try to capture:

1. **Name** — Newsletter name
2. **Author/Organization** — Who runs it
3. **URL** — Signup page or archive
4. **Estimated audience** — subscriber count (often listed on sponsorship pages or About pages)
5. **Topic focus** — What it covers
6. **Frequency** — Daily, weekly, monthly
7. **Sponsorship info** — Rates, format (dedicated send, banner, classified), contact
8. **Audience quality** — Primarily decision-makers or junior folks?
9. **Social proof** — Notable sponsors, testimonials

### Phase 4: Score & Rank

Score each newsletter (0-10):
- Audience overlap with target ICP (+3 max)
- Audience size (+2 for 10K+, +1 for 5K+)
- Sponsorship availability confirmed (+2)
- Reasonable pricing for budget (+1)
- High engagement signals — open rates mentioned, active community (+1)
- Competitors sponsor it — validated audience match (+1)

### Phase 5: Output

Save results to the specified output path as markdown:

```markdown
# Newsletter Sponsorship Opportunities
**Target audience:** [description]
**Industry:** [keywords]
**Date:** YYYY-MM-DD

## Tier 1: Must-Sponsor (Score 8+)
| Newsletter | Author | Est. Audience | Frequency | Sponsorship Rate | Contact | Score |
|-----------|--------|--------------|-----------|-----------------|---------|-------|

## Tier 2: Strong Fit (Score 5-7)
| Newsletter | Author | Est. Audience | Frequency | Sponsorship Rate | Contact | Score |
|-----------|--------|--------------|-----------|-----------------|---------|-------|

## Tier 3: Worth Exploring (Score 3-4)
| Newsletter | Author | Est. Audience | Frequency | Sponsorship Rate | Contact | Score |
|-----------|--------|--------------|-----------|-----------------|---------|-------|

## Competitor Sponsorship Intel
| Competitor | Newsletters They Sponsor | Notes |
|-----------|------------------------|-------|

## Next Steps
1. Reach out to Tier 1 newsletters for rate cards
2. Request media kits from Tier 2 newsletters
3. Set a calendar reminder to refresh this list quarterly
4. Monitor competitor sponsorships monthly
```

## Tips

- Run once per client to set up a sponsorship pipeline
- Refresh quarterly — new newsletters launch all the time
- Monitor competitor sponsorships monthly — if a competitor starts sponsoring a newsletter, that's validating the audience
- Combine with `agentmail` to automate the initial outreach to newsletter operators
- Use `company-contact-finder` whenever a newsletter's sponsorship contact isn't publicly listed
- Newsletters with 5K-50K subscribers often hit the sweet spot for B2B sponsorships — big enough audience, small enough to feel personal
