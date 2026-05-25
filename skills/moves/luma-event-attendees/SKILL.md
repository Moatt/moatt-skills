---
name: luma-event-attendees
version: 1.0.0
description: Surface speakers, hosts, and guest profiles for conferences and events on Luma. Runs in two modes — a free direct scrape for hosts, or an Apify-powered search that returns full guest profiles including LinkedIn, Twitter, and bio data.
tags: [lead-generation]
---

# luma-event-attendees

## Setup

Load your credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json is missing, instruct the user to run: `npx moatt login`

All endpoints require Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`

Pulls speakers, hosts, and registered guest profiles from Luma events to feed outreach prospecting.

## Two Modes

### 1. Direct Scrape (free)

Scrapes Luma event pages directly. Returns event metadata plus hosts. Guest profiles only show up if they're publicly embedded in the page.

```bash
python3 $HOME/skills/moves/luma-event-attendees/scripts/scrape_event.py https://lu.ma/abc123
```

### 2. Apify Search (paid, recommended for guest lists)

Uses the `lexis-solutions/lu-ma-scraper` Apify actor to query Luma and return rich event data including **featured guest profiles** (name, bio, LinkedIn, Twitter, Instagram, website).

```bash
python3 $HOME/skills/moves/luma-event-attendees/scripts/scrape_event.py --search "AI San Francisco"
```

**Cost:** $29/month flat subscription on Apify.
**Rent:** https://console.apify.com/actors/r5gMxLV2rOF3J1fxu

## Setup

### 1. Apify API Token (required for --search mode)

1. Sign up: https://apify.com/
2. Grab the API token: https://console.apify.com/account/integrations
3. Rent the Luma scraper: https://console.apify.com/actors/r5gMxLV2rOF3J1fxu ($29/mo, 24h free trial)
4. Export the token:

```bash
export APIFY_API_TOKEN="apify_api_YOUR_TOKEN_HERE"
# Or drop it into a .env file in the skill directory
```

### 2. Install Dependencies

```bash
pip3 install requests
```

## Usage

### Direct Scrape (free, hosts only)

```bash
# Single event
python3 $HOME/skills/moves/luma-event-attendees/scripts/scrape_event.py https://lu.ma/pwciozw0

# Several events at once
python3 $HOME/skills/moves/luma-event-attendees/scripts/scrape_event.py https://lu.ma/abc https://lu.ma/def

# Export hosts to CSV
python3 $HOME/skills/moves/luma-event-attendees/scripts/scrape_event.py https://lu.ma/abc --output hosts.csv
```

### Apify Search (guest profiles)

```bash
# Find AI events in SF
python3 $HOME/skills/moves/luma-event-attendees/scripts/scrape_event.py --search "AI San Francisco"

# Just list the events without extracting people
python3 $HOME/skills/moves/luma-event-attendees/scripts/scrape_event.py --search "SaaS NYC" --events-only

# Export every guest to CSV
python3 $HOME/skills/moves/luma-event-attendees/scripts/scrape_event.py --search "AI San Francisco" --output guests.csv

# Export as JSON
python3 $HOME/skills/moves/luma-event-attendees/scripts/scrape_event.py --search "AI SF" --output guests.json --json
```

### Caching

Results are cached for 24 hours by default:

```bash
# Force a fresh pull
python3 $HOME/skills/moves/luma-event-attendees/scripts/scrape_event.py --search "AI SF" --no-cache

# Custom cache lifetime
python3 $HOME/skills/moves/luma-event-attendees/scripts/scrape_event.py --search "AI SF" --cache-hours 12
```

### Options Reference

```
Positional:
  urls                    Event URLs to scrape directly (free)

Search:
  --search, -s            Search Luma via Apify (e.g., 'AI San Francisco')
  --events-only           List events only, skip people extraction

Output:
  --output, -o            Output file path (.csv or .json)
  --json                  Emit JSON format (default: CSV)

Cache:
  --no-cache              Bypass cache, always pull fresh
  --cache-hours           Cache max age in hours (default: 24)
```

## Output Format

### CSV Columns

| name | event_role | bio | title | company | linkedin_url | twitter_url | instagram_url | website_url | username | event_name | event_date | event_url |
|------|-----------|-----|-------|---------|-------------|-------------|---------------|-------------|----------|------------|------------|-----------|

### What You Get Per Person

- **name** - Full name
- **event_role** - Host, Guest, or Speaker
- **bio** - Luma profile bio
- **linkedin_url** - LinkedIn profile URL
- **twitter_url** - Twitter/X profile URL
- **instagram_url** - Instagram handle
- **website_url** - Personal website
- **username** - Luma username
- **event_name** - Which event they're associated with
- **event_date** - Event date (ISO format)
- **event_url** - Link to the event

## AI Agent Workflow

This skill is built to be called by an AI agent inside a prospecting workflow:

### Step 1: Find Events

> "Search Luma for AI and SaaS events in San Francisco"

```bash
python3 $HOME/skills/moves/luma-event-attendees/scripts/scrape_event.py --search "AI San Francisco" --events-only
```

### Step 2: Extract Guest Profiles

> "Pull all guest profiles from those events"

```bash
python3 $HOME/skills/moves/luma-event-attendees/scripts/scrape_event.py --search "AI San Francisco" --output guests.csv
```

### Step 3: Qualify Against ICP

Hand the CSV back to the agent for filtering:

> "From these guests, find founders/VPs at B2B SaaS companies, 20-200 employees"

### Step 4: Enrich

For the qualified leads:
- Pull LinkedIn profiles for role/company detail
- Research their companies
- Look for overlapping signals (hiring? recently funded?)

### Step 5: Generate Outreach

> "Draft connection requests for the qualified guests. I'll be at [event]. We sell [product] at [price]. Keep it casual."

## Data Access Realities

| Data | Direct Scrape (free) | Apify Search (paid) |
|------|---------------------|---------------------|
| Event metadata | Yes | Yes |
| Hosts/organizers | Yes | Yes |
| Featured guests (public RSVPs) | Sometimes | Yes |
| Full attendee list | No (requires auth) | Partial (public profiles only) |
| Guest LinkedIn/Twitter | Yes (if on the page) | Yes |
| Guest bio | Yes (if on the page) | Yes |
| Guest email | No | No |

**Note:** Luma events have a `show_guest_list` toggle. When it's off, guest profiles aren't publicly reachable. The Apify scraper can still surface `featured_guests` for events that have them.

## Example Prompts

**Quick search:**
> "Find AI events in SF this month and pull guest profiles"

**Targeted:**
> "Search Luma for 'SaaS growth' events. Export every guest profile to CSV. Then qualify against our ICP: VP+ at B2B SaaS, 50-500 employees."

**Full workflow:**
> "Search Luma for AI and developer events in SF. Pull all guest profiles. For each person with a LinkedIn, check if they match our ICP (founders/VPs at B2B SaaS, 20-200 employees, Series A-C). Draft pre-event connection requests for the ones I'll see at [event name]. We sell GTM engineering at $10K/month. Output qualified leads to CSV."

## Troubleshooting

### "APIFY_API_TOKEN not set"

```bash
export APIFY_API_TOKEN="your_token_here"
```

### "Apify actor not rented"

Rent the Luma scraper at: https://console.apify.com/actors/r5gMxLV2rOF3J1fxu

### No guests found for an event

- The event may have `show_guest_list` switched off
- Try --search mode, which can still surface featured_guests
- Some events just don't publish any guest profiles

### "ModuleNotFoundError: requests"

```bash
pip3 install requests
```

## Metadata

```yaml
metadata:
  clawdbot:
    emoji: "🎤"
    requires:
      env: ["APIFY_API_TOKEN"]
      bins: ["python3"]
      packages: ["requests"]
```

---

Built by Moatt - Powered by Apify (lexis-solutions/lu-ma-scraper)
