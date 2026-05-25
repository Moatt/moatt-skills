---
name: customer-discovery
description: >
  Surface every customer of a target company by sweeping their website, case
  studies, review platforms, press, social media, job listings, and more.
  Reach for this when you need competitive intelligence on who a company is
  selling to.
---

# Customer Discovery

Identifies a company's customers by sweeping many public sources. Returns a deduplicated list with confidence scores attached.

## Quick Start

```
Find all customers of Datadog
```

```
Who are Notion's customers? Use deep mode.
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| Company name | Yes | — | The company to investigate |
| Website URL | No | Auto-detected | The company's website URL |
| Depth | No | standard | `quick`, `standard`, or `deep` |

## Procedure

### Step 1: Gather Inputs

Ask the user to provide:
1. **Company name** (required)
2. **Company website URL** (optional — if not provided, WebSearch for it)
3. **Depth tier** — surface these options, defaulting to Standard:
   - **Quick** (~2-3 min): Website logos, case studies, G2 reviews, press search
   - **Standard** (~5-8 min): Quick + blog posts, Wayback Machine, LinkedIn, Twitter, Reddit, HN, job postings, YouTube
   - **Deep** (~10-15 min): Standard + SEC filings, podcasts, GitHub, integration directories, BuiltWith, Crunchbase

### Step 2: Create Output Directory

```bash
mkdir -p customer-discovery-[company-slug]
```

### Step 3: Run Sources for the Selected Tier

Roll up every find into a single running list. For each candidate customer, record:
- **name**: Company name
- **confidence**: high / medium / low
- **source_type**: e.g., "logo_wall", "case_study", "g2_review", "press", "job_posting"
- **evidence_url**: URL where the evidence lives
- **notes**: One-line description of the evidence

#### Quick Sources

**1. Website logo wall**

Run the scrape_website_logos.py script:
```bash
python3 $HOME/skills/moves/customer-discovery/scripts/scrape_website_logos.py \
  --url "[company-url]" --output json
```

Parse the JSON and append each entry to the customer list.

**2. Case studies page**

WebFetch the company's case studies landing page (try `/case-studies`, `/customers`, `/resources/case-studies`). Pull customer names from headings and body content.

**3. G2/Capterra reviews**

If the `review-site-scraper` skill is on hand, use it to extract reviewer companies:
```bash
python3 $HOME/skills/moves/review-site-scraper/scripts/scrape_reviews.py \
  --platform g2 --url "[g2-product-url]" --max-reviews 50 --output json
```

First, WebSearch for the company's G2 page: `site:g2.com "[company]"`. Then mine reviewer company names from the author info on each review.

**4. Web search for press**

Run these WebSearch queries and harvest customer mentions:
- `"[company]" customer OR "case study" OR partnership`
- `"[company]" "we use" OR "switched to" OR "chose"`

#### Standard Sources (added on top of Quick)

**5. Company blog posts**

WebSearch: `site:[company-domain] customer OR "case study" OR partnership OR "customer story"`

**6. Wayback Machine logos**

Run the scrape_wayback_logos.py script:
```bash
python3 $HOME/skills/moves/customer-discovery/scripts/scrape_wayback_logos.py \
  --url "[company-url]" --output json
```

Logos flagged `still_present: false` are particularly worth noting — they signal former customers.

**7. Founder/exec LinkedIn posts**

WebSearch: `site:linkedin.com "[company]" customer OR "excited to announce" OR "welcome"`

**8. Twitter/X mentions**

WebSearch: `site:twitter.com "[company]" "we use" OR "just switched to" OR "loving"`

**9. Reddit/HN mentions**

Run these WebSearch queries:
- `site:reddit.com "we use [company]" OR "[company] customer"`
- `site:news.ycombinator.com "[company]" customer OR user`

**10. Job postings**

WebSearch: `"experience with [company]" site:linkedin.com/jobs OR site:greenhouse.io OR site:lever.co`

Companies requiring experience with the product are very likely customers.

**11. YouTube testimonials**

WebSearch: `site:youtube.com "[company]" customer OR testimonial OR review`

#### Deep Sources (added on top of Standard)

**12. SEC filings**

WebSearch: `site:sec.gov "[company]"` — comb through 10-K and 10-Q mentions.

**13. Podcast transcripts**

WebSearch: `"[company]" podcast customer OR transcript OR interview`

**14. GitHub usage signals**

WebSearch: `site:github.com "[company-package-name]"` to find the package referenced in dependency files like package.json, requirements.txt, etc.

**15. Integration directories**

WebFetch marketplace listings where the company appears as an integration:
- Salesforce AppExchange
- Zapier's integrations directory
- Slack App Directory
- Any marketplace relevant to the company

**16. BuiltWith detection**

```bash
python3 $HOME/skills/moves/customer-discovery/scripts/search_builtwith.py \
  --technology "[company-slug]" --max-results 50 --output json
```

**17. Crunchbase**

WebSearch: `site:crunchbase.com "[company]" customers OR partners`

### Step 4: Deduplicate Results

Merge entries by company name using fuzzy matching:
- Normalize: lowercase, strip suffixes (Inc, Corp, LLC, Ltd, Co., GmbH)
- Treat "Acme Inc" = "Acme" = "ACME Corp" = "acme.com" as the same company
- When merging, keep the highest confidence tier and accumulate every evidence URL

### Step 5: Assign Confidence

Apply these rules:

**High confidence:**
- Logo currently on the website (from scrape_website_logos.py with confidence "high")
- Published case study or customer story
- Direct quote or testimonial on the company's own site
- Official partnership page listing

**Medium confidence:**
- G2/Capterra review (reviewer's company)
- Press piece describing the customer relationship
- Job posting requiring experience with the product
- YouTube testimonial or video review
- Logo only present in the Wayback Machine (was on the site, since removed)

**Low confidence:**
- Single social media mention (a tweet, a Reddit post)
- Indirect reference ("heard good things about X")
- BuiltWith hit alone (the tech on a site doesn't necessarily mean they're paying)
- HN discussion mention

### Step 6: Generate Report

Produce two output files:

**`customer-discovery-[company]/report.md`:**

```markdown
# Customer Discovery: [Company Name]

**Date:** YYYY-MM-DD
**Depth:** quick | standard | deep
**Total customers found:** N

## High Confidence (N)

| Customer | Source | Evidence |
|----------|--------|----------|
| Shopify | Case study | [link] |
| ... | ... | ... |

## Medium Confidence (N)

| Customer | Source | Evidence |
|----------|--------|----------|
| ... | ... | ... |

## Low Confidence (N)

| Customer | Source | Evidence |
|----------|--------|----------|
| ... | ... | ... |

## Sources Scanned

- Website logo wall: [url] — N customers found
- G2 reviews: N reviews analyzed — N companies identified
- Wayback Machine: N snapshots checked — N logos found (N removed)
- Web search: N queries — N mentions
- ...

## Methodology

This report was produced by the customer-discovery skill, which sweeps public
data sources to identify companies using [Company Name]. Confidence tiers
reflect how strong and direct the evidence is.
```

**`customer-discovery-[company]/customers.csv`:**

CSV with columns: `company_name,confidence,source_type,evidence_url,notes`

Write the CSV via a code block or a small Python script.

## Scripts Reference

| Script | Purpose | Key flags |
|--------|---------|-----------|
| `scrape_website_logos.py` | Extract logos from the current website | `--url`, `--output json\|summary` |
| `scrape_wayback_logos.py` | Surface historical logos via the Wayback Machine | `--url`, `--paths`, `--output json\|summary` |
| `search_builtwith.py` | BuiltWith technology lookup (deep mode) | `--technology`, `--max-results`, `--output json\|summary` |

All scripts depend on `requests`: `pip3 install requests`

External skill scripts (use if available):
- `$HOME/skills/moves/review-site-scraper/scripts/scrape_reviews.py` — G2/Capterra/Trustpilot reviews (needs Apify token)
- `$HOME/skills/moves/linkedin-post-research/scripts/search_posts.py` — LinkedIn post search (needs Apify token)

## Cost

- **Quick / Standard:** Free (relies on WebSearch and free APIs like the Wayback Machine CDX)
- **Deep:** Largely free. BuiltWith's paid API is optional (`--api-key` flag); free scraping is the default.
- External skills (review-site-scraper, linkedin-post-research) may need paid API tokens.
