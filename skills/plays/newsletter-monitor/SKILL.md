---
name: newsletter-monitor
description: >
  Sweep an AgentMail inbox for newsletter signals via configurable keyword campaigns.
  Pulls matched keywords, context snippets, and company mentions from incoming emails.
  Built for watching accounting-industry newsletters for buying signals like
  acquisitions, migrations, and staffing news.
---

# Newsletter Monitor

Sweep an AgentMail inbox for newsletter signals via configurable keyword campaigns. Built for watching accounting-industry newsletters for buying signals — acquisitions, Sage Intacct migrations, staffing challenges, technology adoption.

## Quick Start

```bash
# Set your API key
export AGENTMAIL_API_KEY="your_key_here"

# Sweep the inbox with every campaign (summary view)
python3 skills/newsletter-monitor/scripts/scan_newsletters.py --output summary

# Sweep one campaign, last 7 days
python3 skills/newsletter-monitor/scripts/scan_newsletters.py --campaign acquisitions --days 7 --output summary

# JSON output for downstream processing
python3 skills/newsletter-monitor/scripts/scan_newsletters.py --output json --limit 50
```

## Dependencies

```
pip3 install agentmail python-dotenv
```

## Configuration

Keyword campaigns live in `config/campaigns.json`. Each campaign has a description and a list of keywords for case-insensitive substring matching.

Built-in campaigns:
- **acquisitions** - CPA firm M&A activity
- **sage_intacct** - Sage Intacct migration and implementation signals
- **staffing** - Accounting talent and staffing challenges
- **technology** - Accounting technology adoption

## CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `--campaign NAME` | Run only one campaign | All campaigns |
| `--days N` | Only scan emails from the last N days | No limit |
| `--keywords "a,b,c"` | Custom keywords (overrides campaigns) | Use campaigns.json |
| `--output json\|summary` | Output format | `json` |
| `--inbox ADDRESS` | Override the inbox address | `AGENTMAIL_INBOX` env or `moatt@agentmail.to` |
| `--limit N` | Max messages to fetch | `100` |

## Output

### JSON mode (default)

Returns an array of matched messages with:
- `message_id`, `from`, `subject`, `date`
- `matched_campaigns` - which campaigns fired
- `matched_keywords` - specific keywords hit
- `context_snippets` - 200-char window around each match
- `companies_mentioned` - capitalized multi-word phrases near matches

### Summary mode

Human-readable report grouping matched emails by campaign with snippets and detected companies.

## Downstream Skills

When newsletter signals fire, chain to:
- **company-contact-finder** - look up contacts at mentioned companies
- **accounting-news-monitor** - combine with direct news monitoring for broader signal coverage
