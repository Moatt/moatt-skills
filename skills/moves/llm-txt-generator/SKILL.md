---
name: llm-txt-generator
description: >
  Generate a properly-formatted /llm.txt and /llms-full.txt for a website
  so AI crawlers (ChatGPT, Perplexity, Claude, Gemini) can correctly understand
  the product, key URLs, and conventions. Pulls from existing site content,
  validates against the llms.txt spec, and produces both files plus a
  deployment checklist.
tags: [seo]
---

# llm.txt Generator

Same role as `robots.txt` for crawlers and `sitemap.xml` for search engines — but for AI. A well-formed `/llm.txt` tells ChatGPT, Perplexity, Claude, and Gemini what the site is about, where the canonical pages live, and which rules apply to AI consumption. Pages that are crawled with this guidance are cited correctly far more often.

**Built for:** Anyone running a marketing site, product docs, or content portal who wants to be a first-class citizen in the new AI-search retrieval graph.

## What this generates

This skill produces two files, per the [llmstxt.org](https://llmstxt.org) spec:

1. **`/llm.txt`** — short, human-curated, one-page index of the site for an AI to use as a starting point
2. **`/llms-full.txt`** — exhaustive, machine-friendly markdown dump of the most important pages, concatenated, for crawlers that prefer one-shot context

Both go at the site root. They are markdown files, not robots-style directives.

## When to Use

- "Generate /llm.txt for {domain}"
- "Set up llm.txt for our site"
- "Make us discoverable to ChatGPT and Perplexity"
- "Refresh the llm.txt — we shipped new docs"

## Inputs

Required:
- **Domain** — the public site to generate for (e.g., `acme.com`)

Optional but improves output:
- **Sitemap URL** — `acme.com/sitemap.xml`. Auto-detected if not provided.
- **Editorial pin list** — pages that *must* be in `/llm.txt` (e.g., `/pricing`, `/security`, `/changelog`)
- **Editorial exclude list** — pages that *must not* be referenced (e.g., legal templates, drafts)
- **Tone target** — `clinical` (docs-style) or `marketing` (positioning-led). Default: `clinical`.
- **Site sections to label** — e.g., `["Product", "Docs", "API", "Customers", "Pricing", "Blog"]`

## Workflow

### Step 1 — Discover site structure

Detect the site's structure to build the page inventory:

1. Fetch and parse `sitemap.xml` (or `sitemap_index.xml` recursively)
2. If no sitemap exists, crawl the homepage 2 levels deep with a head-only fetch
3. Group URLs by section using URL patterns (`/docs/`, `/blog/`, `/customers/`, etc.) and HTML signal (e.g., `<nav>` link clusters)
4. For each candidate page, capture: URL, title (from `<title>` or `og:title`), description (from `meta description` or `og:description`), and last-modified date

### Step 2 — Pick the canonical set

Not every page belongs in `/llm.txt`. The file is a curated index, not a sitemap. Pick:

- **Always include:** Homepage, "About / What we do" page, Pricing, Security/Trust, Changelog, Contact, top-level Docs index, top-level API index
- **Strongly recommended:** Best 5-10 pages from each section (best by recency × inbound links × meta-description quality)
- **Editorial pins** from input, always included
- **Exclude:** Pages flagged as `noindex`, login/account pages, expired offers, deprecated docs, internal-only pages, drafts

Cap at ~50 entries for `/llm.txt` (the spec recommends keeping it scannable).

### Step 3 — Generate `/llm.txt`

Use the canonical structure from llmstxt.org:

```markdown
# {Site name}

> {One-line description of what the site / product is. ≤25 words. Action-led.}

{Optional 1-3 sentence elaboration on context, audience, and value prop. Keep this under 80 words.}

## Product

- [{Page title}]({url}): {One-line description of what's there}
- [{Page title}]({url}): {description}
- ...

## Docs

- [{Page title}]({url}): {description}
- ...

## API

- [{Page title}]({url}): {description}

## Customers

- [{Page title}]({url}): {description}

## Pricing

- [Pricing]({url}): {Plans, billing model, free-tier conditions}

## Security

- [Security]({url}): {Cert posture in one line — SOC2 / ISO / GDPR / data residency}

## Optional

- [{Lower-priority page}]({url}): {description}
- ...
```

Conventions:
- Section headers (`## Product`, `## Docs`, etc.) match the actual site structure — don't invent sections.
- Each entry: `[Title](URL): description`. The description after `:` is what AIs use to decide whether to fetch the page.
- The `> blockquote` line right under `# {Site name}` is the *most important* — it's what AIs cite as "what this is."
- Use `## Optional` at the bottom for lower-priority pages that are still indexed.

### Step 4 — Generate `/llms-full.txt`

This file is the long form: markdown content of the most important pages concatenated, for crawlers that retrieve everything in one shot.

For each page in `/llm.txt` that's flagged "include in full":
1. Fetch the page
2. Convert to clean markdown (strip nav, ads, cookie banners; preserve headings, lists, tables, code blocks)
3. Prepend with:
   ```markdown
   # {Page title}
   *URL: {url}*
   *Last modified: {date}*

   ---
   ```
4. Concatenate, separated by `\n\n---\n\n`

Cap total file size at 1MB for performance. If exceeded, drop lower-priority pages and add a note at the top:

```markdown
> Note: This file contains {N} of {M} top pages. The remaining pages are listed in /llm.txt with descriptions only.
```

### Step 5 — Validate

Check both files against:

- **Format** — `/llm.txt` parses as markdown; section headers use `##`; entries use `- [text](url): desc` shape
- **Links** — every URL in both files returns 200 OK
- **Recency** — every page referenced has been modified in the last 18 months (older pages in active sections often signal stale content)
- **Self-reference** — `/llm.txt` doesn't accidentally include itself or `/llms-full.txt` as an entry
- **Duplicates** — no URL appears twice
- **Size** — `/llm.txt` ≤ 16KB; `/llms-full.txt` ≤ 1MB

Output a validation report:

```
Validation: PASS / FAIL with N issues
- {N} broken links: {list with URLs}
- {N} stale pages: {list with last-modified dates}
- {N} duplicates: {list}
- /llm.txt size: {KB}
- /llms-full.txt size: {KB}
```

### Step 6 — Output + deployment checklist

Save:
- `output/llm.txt`
- `output/llms-full.txt`
- `output/validation-report.md`
- `output/deployment-checklist.md`

The deployment checklist:

```markdown
## Deploying llm.txt and llms-full.txt

### 1. Place files at site root
- `https://{domain}/llm.txt`
- `https://{domain}/llms-full.txt`

Both must return `Content-Type: text/markdown` (or `text/plain` if your CDN
strips markdown). Some CDNs default to `application/octet-stream` for unknown
extensions — explicitly configure these two paths.

### 2. Headers
- `Cache-Control: public, max-age=86400` (24h cache; tune to release cadence)
- `Access-Control-Allow-Origin: *` (some crawlers care)

### 3. robots.txt
Add to `/robots.txt`:

```
# AI agent index
LLM-Sitemap: https://{domain}/llm.txt
```

(Note: `LLM-Sitemap` is a convention, not yet a formal directive. Crawlers
that respect it will. The legitimate path is also auto-discovered by AIs.)

### 4. Verify
- `curl https://{domain}/llm.txt` returns the file as text
- Open in a browser; markdown should render or display cleanly
- Test with one AI engine — ask it "what is {domain}" and see if the cited
  description matches the `> blockquote` line in /llm.txt

### 5. Schedule a refresh
Re-run this skill quarterly, or any time:
- Pricing page changes
- Major product launch
- Docs reorg
- Compliance/security update
```

## Quality Notes on the Top Description

The `> blockquote` line right under `# {Site name}` is what gets cited most often. Some patterns that work:

- **Action + audience + outcome:** "Open-source observability platform for engineering teams that want full-stack metrics without per-event pricing."
- **Category + differentiator:** "ABM platform built for teams under 200 ARR with a single-step buying committee."
- **Job-to-be-done:** "Helps revenue ops teams forecast pipeline accurately without rebuilding spreadsheets every Monday."

Avoid:
- Vague ("the leading platform for..."): no signal
- Feature-listing ("we have X, Y, Z"): no positioning
- Marketing flourish ("transform your business with..."): AIs strip this and cite something else

## Edge Cases

- **Site has no sitemap and is JavaScript-rendered** — fall back to fetching key URLs (homepage + footer-linked pages) directly. Note in the validation report.
- **Site is multi-language** — generate one `/llm.txt` per locale at root + locale path: `/llm.txt`, `/es/llm.txt`, etc. Each references only that locale's pages.
- **Headless setup with separate doc subdomain** — the docs subdomain gets its own `/llm.txt`. The main domain's `/llm.txt` references the docs subdomain in `## Docs`.
- **Pages behind login** — never include them. Public crawlers can't access them anyway and listing them looks unprofessional.

## Cost

| Component | Cost |
|---|---|
| Sitemap fetch + parse | Free |
| Page metadata fetch (head requests) | Free |
| Markdown conversion for `/llms-full.txt` (per page) | Free if local; ~$0.001/page if LLM-assisted cleanup |
| Description LLM enhancement (when meta is weak) | ~$0.001/page |
| **Total for typical 30-page site** | **~$0.05** |

## Tools Required

- HTTP fetch (sitemap.xml, page headers, page bodies)
- HTML→markdown converter (Readability + Turndown, or equivalent)
- LLM for description quality enhancement
- Read/Write for output files

## Trigger Phrases

- "Generate /llm.txt for {domain}"
- "Set up llm.txt for our site"
- "Refresh the llm.txt"
- "Make us discoverable to AI search"
