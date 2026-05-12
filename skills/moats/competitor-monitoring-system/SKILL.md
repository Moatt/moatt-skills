---
type: playbook
name: competitor-monitoring-system
description: >
  Set up and run ongoing competitive intelligence monitoring for a client.
  Tracks competitor content, ads, reviews, social presence, and product moves.
---

# Competitor Monitoring System

Spin up ongoing competitive intelligence for a client. Watches competitor content, ads, reviews, social presence, and product moves. Ships regular intelligence reports.

## When to Use

- "Set up competitor monitoring for [client]"
- "Track what [competitors] are doing"
- "Monitor [competitor] content and ads"

## Prerequisites

- A list of competitors to track (typically 3-7)
- Client context with the competitive positioning
- Competitor founder/executive LinkedIn profiles (for social monitoring)

## Setup Steps

### 1. Define Competitor Watchlist

Create a competitor tracking file: `clients/<client-name>/intelligence/competitor-watchlist.md`

Per competitor, document:
- Company name and URL
- Core products/features
- Founder/exec LinkedIn profiles
- Known content channels (blog URL, YouTube, podcast)
- Review profiles (G2, Capterra URLs)
- Ad library pages (Meta, Google)

### 2. Initial Competitive Baseline

Run the full competitor-intel composite per competitor to establish a baseline:

**Skill**: competitor-intel (chains reddit + twitter + linkedin + blog + review scrapers)

Plus:
- **Skill**: google-ad-scraper — grab their current Google ads
- **Method**: hit the Meta Ad Library (facebook.com/ads/library) through `web_search` for Meta ad research
- **Skill**: review-site-scraper — pull the freshest G2/Capterra/Trustpilot reviews

**Output**: `clients/<client-name>/intelligence/competitor-baseline.md`

### 3. Configure Monitoring Cadence

| What to Monitor | Frequency | Skill | What to Look For |
|----------------|-----------|-------|-----------------|
| Blog/content output | Weekly | blog-feed-monitor | New posts, topic shifts, SEO attacks |
| Social media posts | Weekly | linkedin-profile-post-scraper + twitter-mention-tracker | Messaging changes, product announcements, engagement patterns |
| Reddit/HN mentions | Weekly | reddit-post-finder + hacker-news-scraper | User sentiment, complaints, praise, feature requests |
| Ad creative changes | Bi-weekly | google-ad-scraper + web_search (Meta Ad Library) | New campaigns, messaging shifts, spend changes |
| Review sentiment | Monthly | review-site-scraper | New reviews, rating trends, common complaints |

### 4. Run Monitoring

For every monitoring cycle:

1. Trigger the relevant scrapers for the cycle type
2. Compare the new data against the baseline or previous cycle
3. Surface any material changes:
   - New product features or pricing shifts
   - Fresh content targeting our client's keywords
   - Negative review trends (poaching opportunity)
   - New ad campaigns (messaging intelligence)
   - Founder/exec public statements about strategy

### 5. Produce Intelligence Report

After every cycle, produce a short intelligence summary:

```
# Competitor Intelligence — [Client] — Week of [Date]

## Key Changes
- [Competitor A] published 3 new blog posts targeting "[keyword]"
- [Competitor B] launched a new Meta ad campaign focused on [theme]
- [Competitor C] received 5 negative G2 reviews about [issue]

## Recommended Actions
- Publish response content for [Competitor A]'s keyword attack
- Create a comparison page addressing [Competitor B]'s new messaging
- Target [Competitor C]'s unhappy customers with migration content

## Detailed Findings
[Per-competitor breakdown]
```

**Output**: `clients/<client-name>/intelligence/competitor-reports/[date].md`

## Ongoing Cadence

- **Weekly**: content + social monitoring, short report
- **Bi-weekly**: ad monitoring
- **Monthly**: full review scrape + comprehensive report
- **Quarterly**: re-run the full competitor-intel baseline, refresh the watchlist

## Human Checkpoints

- **After setup**: review the competitor watchlist and the monitoring plan
- **After each report**: confirm the recommended actions before executing
