---
name: tech-stack-teardown
description: >
  Reverse-engineer a company's sales and marketing tech stack from public signals.
  Detects CRMs, cold-email tools, people databases, ad pixels, email-delivery services,
  and outbound sending domains via DNS records, website source inspection, Apify
  technology profiling, blacklist checks, and public spam-complaint searches. Works
  on single companies or batches. Produces a structured markdown report per company.
tags: [competitive-intel]
---

# Tech Stack Recon

## Setup

Load credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json doesn't exist, tell the user to run: `npx moatt login`

All endpoints authenticate via Bearer: `-H "Authorization: Bearer $MOATT_API_KEY"`

Reverse-engineer a company's sales, marketing, and outbound infrastructure from public signals alone. No login, no API access to their tooling — everything comes from DNS records, website source code, technology profiling, blacklist databases, and public complaints.

## What It Detects

| Category | Tools Detected |
|----------|---------------|
| **CRM** | HubSpot, Salesforce (via SPF, website pixels, DNS) |
| **Cold Email Tools** | Smartlead, Instantly, Outreach, Salesloft, Lemlist (via SPF, DKIM, TXT records, website source) |
| **People Databases** | Apollo, ZoomInfo, Clearbit, 6sense (via website tracker scripts) |
| **Email Delivery** | SendGrid, Amazon SES, Postmark, Mailgun, Mandrill (via SPF includes, DKIM selectors) |
| **Email Marketing** | Mailchimp, Brevo, ActiveCampaign, Klaviyo (via DKIM selectors) |
| **Ad Retargeting** | LinkedIn Insight Tag, Facebook Pixel, AdRoll, Reddit Ads, Twitter Ads (via Apify profiler + source) |
| **Website Builder** | Webflow, Framer, Next.js, WordPress (via Apify profiler + source) |
| **Chat / Support** | Intercom, Drift, Crisp, Zendesk (via website source) |
| **Analytics** | Google Analytics, Segment, Mixpanel, Amplitude, PostHog, Heap (via website source) |
| **Outbound Domains** | Separate cold-sending domains (via SPF-only Google Workspace + redirect to primary) |

## How It Works

Detection runs in 5 layers — each surfaces different signals:

### Layer 1: DNS Records (Free, instant)

```
MX     → Primary email provider (Google Workspace, Microsoft 365, etc.)
SPF    → Every service authorized to send email on their behalf
DKIM   → Cryptographic proof of which tools actually send their email
DMARC  → Email authentication policy (how strict they are)
TXT    → Misc verifications (Smartlead tracking domains, tool verifications)
CNAME  → Subdomains pointing to third-party services
```

This is the highest-signal layer. SPF and DKIM don't lie — if SendGrid is in their SPF, they're using SendGrid.

### Layer 2: Website Source Inspection (Free, instant)

Fetches the target website and greps the HTML for:
- Tracking pixels (Apollo, REB2B, HubSpot, Facebook, LinkedIn)
- Script tags loading third-party tools
- Meta tags and framework signatures
- Hidden form handlers and API endpoints

### Layer 3: Apify Technology Profiler (Pay-per-use, ~$0.005/domain)

Runs the `justa/technology-profiling-engine` actor for deep detection across 7,000+ technologies using an 8-tier inspection with confidence scores. Catches tools that don't surface in source code (loaded dynamically, via GTM, etc.).

### Layer 4: Blacklist Checks (Free, instant)

Queries 6 major DNS-based blacklists:
- Spamhaus (zen.spamhaus.org)
- Barracuda (b.barracudacentral.org)
- SpamCop (bl.spamcop.net)
- SORBS (dnsbl.sorbs.net)
- SURBL (multi.surbl.org)
- URIBL (black.uribl.com)

### Layer 5: Public Complaint Search (Free)

Web searches for spam complaints on Trustpilot, Reddit, SpamCop forums, and the general web. Also searches for the company name + tool names to surface public mentions of their stack.

## Cost

| Component | Cost |
|-----------|------|
| DNS queries | Free |
| Website source fetch | Free |
| Blacklist checks | Free |
| Web searches | Free |
| Apify Technology Profiler | ~$0.005 per domain |

**Typical costs:**
| Scenario | Domains | Est. Cost |
|----------|---------|-----------|
| Single company | 1 | ~$0.005 |
| Small batch | 5 | ~$0.025 |
| Large batch | 20 | ~$0.10 |

Skip the Apify profiler with `--no-apify` for a free-only analysis (DNS + source + blacklists).

## Setup

### 1. Required

```bash
# dig (DNS lookups) — included on macOS/Linux
which dig

# curl (website source fetch) — included on macOS/Linux
which curl

# Python 3 with requests + dotenv
pip3 install requests python-dotenv
```

### 2. Optional (for Apify Technology Profiler)

```bash
# Get your token at https://console.apify.com/account/integrations
# Add to .env:
APIFY_API_TOKEN=apify_api_YOUR_TOKEN_HERE
```

## Usage

### Single Company

```bash
python3 $HOME/skills/moves/tech-stack-teardown/scripts/recon.py --domains pump.co
```

### Batch of Companies

```bash
python3 $HOME/skills/moves/tech-stack-teardown/scripts/recon.py --domains "dili.ai,pump.co,runautomat.com"
```

### Free-Only Mode (No Apify)

```bash
python3 $HOME/skills/moves/tech-stack-teardown/scripts/recon.py --domains pump.co --no-apify
```

### Output to File

```bash
python3 $HOME/skills/moves/tech-stack-teardown/scripts/recon.py --domains "dili.ai,pump.co" --output /path/to/report.md
```

### JSON Output

```bash
python3 $HOME/skills/moves/tech-stack-teardown/scripts/recon.py --domains pump.co --json
```

## What the Script Does

Per domain:

1. **DNS Scan** — queries MX, SPF, DKIM (18 common selectors), DMARC, TXT records, and 30+ common subdomains (email, tracking, click, bounce, send, smtp, mail, etc.)
2. **Website Source Scan** — fetches the homepage HTML and greps for 40+ known tool signatures (script URLs, pixel IDs, tracking domains)
3. **Apify Technology Profile** (optional) — runs the deep 8-tier technology detection across 7,000+ technologies with confidence scores
4. **Blacklist Check** — queries 6 DNS-based blacklists for the domain
5. **Outbound Domain Detection** — checks whether common variations of the domain exist (get[name].com, try[name].com, [name]reach.com, etc.) and analyzes their DNS for cold-outbound patterns
6. **Report Generation** — produces a structured markdown report with confirmed tools, evidence, email-auth assessment, blacklist status, and an overall assessment

## Agent Integration

When using this skill as an agent, follow this flow:

1. User provides one or more company domains
2. Run `recon.py` for all of them (confirm Apify cost if > 5 domains)
3. Present the report — group findings by:
   - **Confirmed tools** (with evidence)
   - **Email authentication** (SPF/DKIM/DMARC assessment)
   - **Deliverability** (blacklist status + spam complaints)
   - **Notable signals** (outbound domains, missing DMARC, SPF gaps)
4. If batch, end with a comparative summary table

### Agent Without the Script

The agent can perform every check manually using built-in tools:

**DNS checks** — use the `Bash` tool:
```bash
dig +short MX example.com
dig +short TXT example.com
dig +short TXT _dmarc.example.com
dig +short TXT selector._domainkey.example.com
dig +short CNAME subdomain.example.com
```

**Website source scan** — use the `Bash` tool:
```bash
curl -sL https://www.example.com | grep -oi 'pattern1\|pattern2\|pattern3' | sort -u
```

**Blacklist checks** — use the `Bash` tool:
```bash
dig +short example.com.zen.spamhaus.org A
```

**Apify profiler** — use the `Bash` tool with Python:
```python
# See scripts/recon.py for the full implementation
```

**Spam complaints** — use the `WebSearch` tool:
```
"example.com" spam OR unsolicited OR "cold email" OR blacklist
```

## DNS Record Cheat Sheet

### SPF Includes → Tool Identification

| SPF Include | Tool |
|-------------|------|
| `_spf.google.com` | Google Workspace |
| `spf.protection.outlook.com` | Microsoft 365 |
| `sendgrid.net` | SendGrid |
| `amazonses.com` | Amazon SES |
| `*.hubspotemail.net` | HubSpot |
| `*.rsgsv.net` or `servers.mcsv.net` | Mailchimp/Mandrill |
| `spf.mandrillapp.com` | Mandrill (Mailchimp transactional) |
| `mail.zendesk.com` | Zendesk |
| `*.freshdesk.com` | Freshdesk |
| `spf.mailjet.com` | Mailjet |
| `spf.brevo.com` | Brevo (Sendinblue) |
| `_spf.salesforce.com` | Salesforce |
| `mktomail.com` | Marketo |
| `postmarkapp.com` | Postmark |
| `mailgun.org` | Mailgun |

### DKIM Selectors → Tool Identification

| Selector Pattern | Tool |
|-----------------|------|
| `google._domainkey` | Google Workspace |
| `selector1._domainkey` / `selector2._domainkey` | Microsoft 365 |
| `s1._domainkey` / `s2._domainkey` → `*.sendgrid.net` | SendGrid |
| `k1._domainkey` → `*.mcsv.net` or `dkim.mcsv.net` | Mailchimp |
| `k2._domainkey` / `k3._domainkey` → `dkim2.mcsv.net` / `dkim3.mcsv.net` | Mailchimp |
| `mandrill._domainkey` | Mandrill |
| `pm._domainkey` | Postmark |
| `smtp._domainkey` | Generic SMTP |
| `em._domainkey` | Various (check the CNAME target) |

### TXT Records → Tool Identification

| TXT Pattern | Tool |
|-------------|------|
| `open.sleadtrack.com` | **Smartlead** (custom tracking domain) |
| `hubspot-developer-verification=*` | HubSpot |
| `anthropic-domain-verification-*` | Anthropic (Claude) |
| `MS=*` | Microsoft 365 |
| `google-site-verification=*` | Google Search Console |
| `slack-domain-verification=*` | Slack |
| `atlassian-domain-verification=*` | Atlassian (Jira/Confluence) |
| `docusign=*` | DocuSign |
| `facebook-domain-verification=*` | Facebook/Meta |
| `_github-pages-challenge-*` | GitHub Pages |
| `stripe-verification=*` | Stripe |

### Website Source Patterns → Tool Identification

| Pattern in HTML | Tool |
|----------------|------|
| `assets.apollo.io/micro/website-tracker` | Apollo.io (visitor tracking) |
| `hs-script` or `js.hs-scripts.com` | HubSpot |
| `px.ads.linkedin.com` | LinkedIn Insight Tag |
| `connect.facebook.net` or `fbq(` | Facebook Pixel |
| `snap.licdn.com` | LinkedIn Insight Tag |
| `cdn.segment.com` | Segment |
| `cdn.mxpnl.com` or `mixpanel` | Mixpanel |
| `cdn.amplitude.com` | Amplitude |
| `app.posthog.com` or `posthog` | PostHog |
| `widget.intercom.io` | Intercom |
| `js.driftt.com` | Drift |
| `client.crisp.chat` | Crisp |
| `static.zdassets.com` | Zendesk |
| `s3-us-west-2.amazonaws.com` + `reb2b` | REB2B |
| `clearbit.com/tag.js` or `reveal` | Clearbit Reveal |
| `6sc.co` or `6sense` | 6sense |
| `tag.demandbase.com` | Demandbase |
| `d.adroll.com` | AdRoll |
| `googletagmanager.com` | Google Tag Manager |
| `gtag('config', 'G-*')` | Google Analytics 4 |

### Cold Outbound Domain Patterns

A separate domain is being used for cold email if it has:
- Google Workspace MX (or similar) but **no product/marketing email tools** in SPF
- SPF that only includes `_spf.google.com` (sending from raw mailboxes)
- A 301/302 redirect to the company's primary domain
- No website content of its own
- A domain name following patterns like `[brand]reach.com`, `get[brand].com`, `try[brand].com`, `meet[brand].com`, `[brand]hq.com`

## DMARC Assessment Guide

| Policy | Meaning | Assessment |
|--------|---------|------------|
| `p=reject` | Reject unauthenticated email | Strong — best practice |
| `p=quarantine` | Send to spam if unauthenticated | Good — enforcing |
| `p=none` | Monitor only, don't enforce | Weak — anyone can spoof the domain |
| No DMARC record | No policy at all | **Missing** — wide open to spoofing |

## Troubleshooting

### "No tools detected"
- The company may be very early-stage with minimal tooling
- Some tools (like Apollo used purely for prospecting, not sending) leave no DNS trace
- LinkedIn Sales Navigator, Clay enrichment, and similar tools don't surface public signals
- Try the Apify profiler if you only ran free-only mode

### "SPF has Google only but they use Smartlead/Instantly"
- That's normal. Smartlead and Instantly typically connect to Google Workspace mailboxes via SMTP and send **through** Google — so SPF passes via Google's include. The cold-email tool itself doesn't need its own SPF entry.
- Look for Smartlead's `open.sleadtrack.com` in TXT records or website source as confirmation.

### "Apify profiler timed out"
- Some sites take longer to load. The profiler has a 3-minute timeout.
- Retry once. If it fails again, fall back to DNS + source-code analysis.

### "artisan.ai resolves but redirects to Afternic"
- The domain is parked/for sale. Try common alternatives: `.co`, `.com`, `.io`.
- Wildcard DNS (every subdomain resolves to the same IP) is a parked-domain tell.

## Links

- [Apify Technology Profiling Engine](https://apify.com/justa/technology-profiling-engine)
- [Apify API Token](https://console.apify.com/account/integrations)
- [MXToolbox](https://mxtoolbox.com/) — manual verification
- [Spamhaus Domain Lookup](https://check.spamhaus.org/)
