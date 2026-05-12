---
type: playbook
name: signal-detection-pipeline
description: Detect buying signals across multiple sources, qualify leads, and generate outreach context
---

# Signal Detection Pipeline

Watch several signal sources to surface companies actively in-market for your client's solution. Stack signals together for higher-confidence leads.

## When to Use

- "Find companies that might need [our product]"
- "Run signal detection for [problem area]"
- "Find buying signals in [industry/topic]"

## Signal Sources

Run the sources that match the client's ICP. Each one is independent — fire them in parallel.

### Job Posting Signals (Strongest)
**Skill:** job-posting-intent

Companies hiring for roles in the problem area = budget allocated and pain acknowledged.
- Input: job keywords, ICP criteria
- Output: qualified companies with outreach angles

### Funding Signals
**Skill:** funding-signal-monitor

Recently funded companies = budget on hand, growth mandate.
- Input: industry, funding-stage filter
- Output: funded companies with timing context

### Conference Attendance Signals
**Skill:** luma-event-attendees

People showing up at events in the problem space = actively engaged.
- Input: event URLs or topic search
- Output: person/company list

### Reddit Pain Signals
**Skill:** reddit-post-finder

People venting about or debating the problem = feeling the pain.
- Input: keywords, relevant subreddits
- Output: posts with authors and context

### LinkedIn Content Signals
**Skill:** linkedin-post-research + linkedin-commenter-extractor

People posting on or engaging with the problem = thought leaders or practitioners.
- Input: keywords, time frame
- Output: posters and commenters with engagement data

## Combining Signals

Once the relevant sources have run:

1. **Deduplicate** companies that show up across multiple signals (multi-signal = strongest leads)
2. **Score** each lead: assign signal strength using source quality and recency
   - Job posting + funding = highest intent
   - LinkedIn post + Reddit complaint = validated pain
   - Single conference attendance = lowest (awareness only)
3. **Enrich** the top leads with web search for company details
4. **Consolidate** into one Google Sheet: Company, Signal Sources, Signal Strength, Context, Outreach Angle
5. **Prioritize** companies showing multiple signal types

## Human Checkpoints

- **After combining signals**: review the consolidated list before outreach
