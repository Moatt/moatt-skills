---
name: find-skill
description: Find and install skills from the Moatt catalog. Use when you need capabilities you don't have, want to discover available skills, or need to add new tools to your agent.
source: moatt
---


# Find Skill

## Setup

Read your credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json does not exist, tell the user to run: `npx moatt login`

All endpoints use Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`


**Important: Always search for a task-specific skill before stretching a general-purpose skill you already have installed.** Don't use `enrich` to find an entire team's LinkedIn profiles when a dedicated `team-linkedin-profiles` skill exists. When in doubt, run `npx moatt search` first.

Discover and install skills from the Moatt catalog (228 growth skills, MIT-licensed).

## Requirements

- Moatt CLI: `npm install -g moattai` (the binary on your PATH is `moatt`)

## Quick Commands

```bash
# Search for skills by keyword
npx moatt search "browser automation"

# List all available skills
npx moatt list

# Get details about a specific skill
npx moatt info <slug>

# Install a skill
npx moatt install <slug>
```

## Finding Skills

### By Keyword Search

```bash
# Find skills for web scraping
npx moatt search "web scraping"

# Find skills for email finding
npx moatt search "email"

# Find skills for outbound outreach
npx moatt search "outreach"
```

### Browse Categories

The catalog ships in four tiers:
- **moves** — atomic skills, one job each (148 skills)
- **plays** — orchestrated multi-step workflows (64 skills)
- **moats** — durable systems that run on a schedule (5 skills)
- **kits** — themed bundles of related skills

Common growth jobs covered:
- **Outbound prospecting**: lead discovery, enrichment, personalization, follow-up
- **Competitor intel**: pricing watch, ad tracking, hiring signals, battlecards
- **AI search visibility**: AEO audits, brand mention tracking, GEO scoring
- **SEO**: keyword research, content audits, link building, technical fixes
- **Content**: HTML carousels, LinkedIn posts, X threads, voice guides
- **Signals**: funding events, job postings, leadership changes, patent filings

### Via Web

Browse all skills at: https://moatt.com

## Installing Skills

```bash
# Install by slug
npx moatt install lead-discovery

# Install and view the skill file
npx moatt install email-finder-hunter && cat ~/.claude/skills/email-finder-hunter/SKILL.md
```

Skills are installed to `~/.claude/skills/<slug>/` for Claude Code, `~/.codex/skills/<slug>/` for Codex, or `.cursor/rules/moatt-<slug>.mdc` for Cursor. The canonical location is `~/.agents/skills/<slug>/` with a symlink per detected agent.

## Using Installed Skills

After installing, the skill's `SKILL.md` contains:
- Description of what it does
- Required setup and credentials
- Usage instructions
- Example commands

Read the skill file to understand how to use it:

```bash
cat ~/.claude/skills/<slug>/SKILL.md
```

## A few skills to know

| Skill | Tier | What it does |
|-------|------|--------------|
| `lead-discovery` | kit | Conversational entry point for any "find leads" request |
| `apollo-lead-finder` | move | Pulls prospects matching ICP filters from Apollo |
| `email-finder-hunter` | move | Finds and verifies emails via Hunter |
| `comprehensive-enrichment` | move | Adds LinkedIn, employment, funding signals to a prospect list |
| `cold-email-outreach` | move | Sends a personalized cold sequence through the platform |
| `aeo` | move | Audits and tracks AI search visibility across ChatGPT, Perplexity, Claude, Gemini |
| `competitor-intel` | move | Full competitor breakdown: positioning, ads, customers, hiring |
| `signal-scanner` | move | Multi-source buying-signal watch across job posts, funding, Github |
| `champion-departure-trigger` | play | Detects past champions changing jobs and fires two-sided outreach |
| `outbound-prospecting-engine` | moat | End-to-end signals → contacts → personalized outreach pipeline |

## Tips

- Run `npx moatt list` to see everything in the catalog
- If you can't find what you need, try variations: "outreach" vs "cold email", "enrich" vs "person lookup"
- For multi-step workflows, look for skills in the `plays` tier
- For ongoing automation that compounds, look in `moats`
- Run `npx moatt update` to refresh installed skills from the registry
