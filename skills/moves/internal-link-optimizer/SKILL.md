---
name: internal-link-optimizer
description: >
  Audit a site's internal linking structure, identify orphan pages,
  topical clusters lacking hub-and-spoke connection, and pages with
  too many or too few outbound internal links. Generate a prioritized
  list of internal-link insertions: which existing page should link
  to which target, with recommended anchor text grounded in real
  on-page context. The single highest-leverage SEO action for a
  content-heavy site, powered by the DataForSEO OnPage API.
tags: [seo]
---

# Internal Link Optimizer

## Setup

Read your credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json does not exist, tell the user to run: `npx moatt login`

All endpoints use Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`

A site's internal linking structure is one of the strongest signals to search engines about which pages are central, which are supporting, and how topics relate. Most content sites bleed PageRank because their internal graph is accidental — pages that should be hubs aren't linked to enough; supporting pages don't link to the hubs that depend on them. This skill audits the graph and outputs specific link-insertion tasks.

**Built for:** SEO and content teams running 50+ page sites who want to systematically improve topical authority without rewriting content.

## Prerequisites

**Recommended (production):** DataForSEO credentials
- Sign up at [dataforseo.com](https://dataforseo.com) → API → copy login + password
- Set `MOATT_API_KEY` — routes DFS through Moatt's proxy and meters usage on your platform credits

**Fallback (no DFS):** Manual sitemap crawl via HTTP fetch + HTML parser. Slower, less accurate (no JS rendering by default), but works without API credentials.

## Cost (DFS path)

| Component | Endpoint | Est. Cost |
|---|---|---|
| OnPage crawl (500 pages) | `on_page/task_post` + `summary` | ~$0.05–0.10 |
| Internal links graph | `on_page/links/live` | ~$0.02 |
| Non-indexable pages | `on_page/non_indexable` | ~$0.01 |
| **Typical run** | | **~$0.10** |

Versus a hand-rolled crawler: free in API cost but slower (minutes per 500 pages), missing JS-rendered links, and no built-in broken-link / non-indexable detection.

## When to Use

- "Run the internal link audit on {domain}"
- "Find orphan pages on our site"
- "Build the internal link map for the {topic} cluster"
- "Generate link insertion tasks for {section}"

## What it audits

| Issue | Why it matters |
|---|---|
| **Orphan pages** | Pages with zero or near-zero internal inbound links rank poorly regardless of content quality |
| **Hub pages with thin link-in** | Cornerstone content (pillar pages) needs many internal links to signal authority |
| **Supporting pages not linking up to hubs** | Topic clusters work when supporting pages all link to the cluster's hub |
| **Over-linked pages** | Pages with 50+ outbound internal links dilute PageRank flow per link |
| **Generic anchor text** | "Click here" / "Learn more" — passes far less topical signal than descriptive anchor |
| **Broken internal links** | Linked-to URL returns 404 or 301-chain |
| **Missing related-content links** | Two pages on similar topics with no link between them |
| **Cross-pillar bleeding** | Pillar page on topic A linking heavily to pillar B's supporting pages dilutes both |

## Inputs

Required:
- **Domain or sitemap URL**

Optional but improves accuracy:
- **Topic cluster definition** — which pages are pillars vs. supporting per topic. If absent, the skill infers from URL structure + content similarity.
- **Existing analytics** — high-traffic pages get higher priority for link-graph improvements
- **Manual exclusions** — pages to skip (legal, account pages, archived)

## Workflow

### Step 1 — Crawl the site

**Primary path: DataForSEO OnPage API.** One async task returns the full internal-link graph (with anchors, link context, dofollow flags, broken-link status) plus per-page metadata in structured JSON. Faster and more accurate than rolling a crawler — DFS handles JS rendering, redirect resolution, and 4xx detection in one shot.

#### 1a. Kick off the crawl

```
POST /v3/on_page/task_post
{
  "target": "example.com",
  "max_crawl_pages": 500,
  "load_resources": true,
  "enable_javascript": true,
  "custom_js": "",
  "store_raw_html": false
}
```

Returns a task ID. Crawl runs asynchronously — typically 1–5 minutes for 500 pages.

#### 1b. Poll for completion

```
POST /v3/on_page/summary
{ "id": "<task_id>" }
```

Wait until `crawl_progress` is `finished`. The summary also gives you per-domain totals (pages crawled, broken links, duplicate metas) used downstream for cluster sanity checks.

#### 1c. Pull the internal-link graph

```
POST /v3/on_page/links/live
{
  "id": "<task_id>",
  "limit": 1000,
  "filters": [["type", "=", "internal"]]
}
```

Each link record contains everything Steps 2–4 need:

| Field | Use in this skill |
|---|---|
| `from_url` | Source page in the graph |
| `to_url` | Target page in the graph |
| `anchor_text` | Anchor-quality scoring + generic-anchor detection |
| `link_type` | Filter to `internal` (already filtered above) |
| `dofollow` | Weight in PageRank estimate (nofollow links flow ~0) |
| `link_attribute` | `rel` attributes (sponsored / ugc) |
| `text_pre` / `text_post` | Surrounding context for anchor-quality + insertion-point reasoning |
| `is_broken` | Direct broken-link detection (no separate HEAD request needed) |

Paginate via the `limit` + `offset` params if the site has more than 1,000 internal links.

#### 1d. Pull non-indexable / orphan candidates

```
POST /v3/on_page/non_indexable
{ "id": "<task_id>", "limit": 500 }
```

Returns pages blocked from indexing (`noindex`, `robots.txt`, canonical pointing elsewhere). Cross-reference these against the link graph in Step 4 — a page with thin inbound links AND a noindex tag isn't an orphan to fix, it's intentional.

Optionally, for content-type segmentation:

```
POST /v3/on_page/pages_by_resource
{ "id": "<task_id>", "limit": 500 }
```

Useful for separating HTML pages from PDFs, images, and scripts before clustering.

#### 1e. Normalize into the per-page record

For each page returned by the crawl, build:

- URL
- Title
- Meta description
- H1 + H2 hierarchy
- Body markdown (cleaned)
- All outbound internal links (URL + anchor text + surrounding context — all from `on_page/links/live`)
- All outbound external links (count only — they're not the focus)
- Word count
- Last-modified date

Cache the crawl (task ID + extracted records); refresh on schedule (or on-demand when content changes). DFS retains task results for ~30 days, so a cached task ID lets you re-pull without re-crawling.

#### Fallback (no DFS)

If `MOATT_API_KEY` is unset, fall back to a manual crawl:

1. Fetch `sitemap.xml` (or RSS, blog index).
2. For each URL, HTTP fetch + parse HTML (use a headless browser if the site is JS-rendered).
3. Extract the same per-page record fields above — title, metas, headings, body, internal `<a>` hrefs + anchor text + ±200 chars of surrounding text.
4. Issue a HEAD request per internal target to mark broken links (or batch-check after the crawl).

Slower and less accurate — no JS rendering by default, no built-in `is_broken` flag, no `non_indexable` detection — but produces the same downstream record shape so Steps 2–9 are unchanged.

### Step 2 — Cluster by topic

Auto-cluster pages into topical groups using:

- URL structure (`/blog/seo/`, `/blog/marketing/` likely separate clusters)
- TF-IDF similarity on body content
- Shared keyword presence

Each cluster has:
- Pillar candidate(s) — the longest, most-linked-to, highest-traffic page in the cluster
- Supporting pages — pages on the same topic at narrower scope

### Step 3 — Build the internal link graph

For each page, capture:
- `inbound_links_count` — how many pages link to this one
- `outbound_internal_links_count` — how many internal links this page has
- `outbound_internal_links` — array of (target_url, anchor_text, context_snippet)
- `pagerank_estimate` — local PageRank computed from the graph

### Step 4 — Detect issues per page

For each page, run the issue checks:

#### Orphan
```
inbound_links_count <= 1
```
(1 link is often just the homepage navigation — effectively orphan)

#### Thin hub
```
page is a cluster pillar AND inbound_links_count < (cluster_size × 0.5)
```

#### Supporting page not linking up
```
page is in a cluster AND no outbound link to the cluster's pillar
```

#### Over-linked
```
outbound_internal_links_count > 50 OR > (word_count / 100)
```

#### Generic anchor
```
anchor matches: ["click here", "read more", "learn more", "this", "here", "more info"]
```

#### Broken
```
target URL returns 4xx or chains through 3+ redirects
```

#### Missing related
```
For pages with TF-IDF similarity > 0.6 to another page, AND
no current internal link between them
```

### Step 5 — Generate link insertion tasks

For each detected issue, produce a specific task:

```json
{
  "task_id": "",
  "type": "add_link | fix_anchor | remove_link | fix_broken",
  "priority": "high | medium | low",
  "source_page": "<URL of the page where the link should appear>",
  "target_page": "<URL the link should point to>",
  "current_state": "<no link exists | link with anchor 'click here' | broken link to /old-url>",
  "recommended_anchor": "<descriptive anchor text>",
  "recommended_context": "<the paragraph or sentence on the source page where the link best fits>",
  "rationale": "<why this insertion improves the graph>",
  "estimated_impact": "<which PageRank-flow / topical-cluster benefit>"
}
```

### Step 6 — Recommended anchor text

For each suggested link, generate descriptive anchor text:

1. Pull 3-5 sentences of context from the source page near where the link should go
2. Identify the natural phrase that maps to the target page's primary keyword
3. Suggest the anchor — typically 3-7 words, descriptive, includes the target's primary keyword without being keyword-stuffed

Bad anchor: "Click here" / "Learn more" / "this article"
OK anchor: "our SEO guide"
Great anchor: "the complete guide to programmatic SEO"

### Step 7 — Prioritize

Sort tasks by impact × ease:

| Type | Impact | Ease |
|---|---|---|
| Fix broken link | High (loses traffic) | High |
| Add link from high-traffic page to orphan/pillar | Very high | Medium |
| Add hub→supporting links | High | Medium |
| Fix generic anchor | Medium | High |
| Add cross-pillar links (when topically genuine) | Medium | Medium |
| Remove links from over-linked pages | Low (controversial; sometimes content needs them) | Low |

Cap recommendations to ~50 per audit so the team can actually act on them.

### Step 8 — Output

```markdown
## Internal Link Audit — {domain} — {date}

**Pages crawled:** {N}
**Topic clusters detected:** {K}
**Issues found:** {M}

---

### Cluster summary

| Cluster | Pillar | Supporting pages | Internal links into pillar | Health |
|---|---|---|---|---|
| {Topic A} | {URL} | 12 | 3 ⚠️ | Needs work |
| {Topic B} | {URL} | 8 | 18 ✓ | Healthy |
| ... | ... | ... | ... | ... |

---

### Top 50 link insertion tasks (prioritized)

#### Task 1 — High priority
- **Type:** Add link
- **Source:** /blog/seo-strategies (high-traffic page)
- **Target:** /blog/programmatic-seo-guide (cluster pillar with thin link-in)
- **Current state:** No link
- **Recommended anchor:** "the complete guide to programmatic SEO"
- **Recommended insertion point:** "...covered in {recommended anchor}, which walks through how to scale this approach without thin-content penalties."
- **Rationale:** /blog/seo-strategies has 4× the traffic of the target pillar. Linking to it from this page passes meaningful PageRank to a cluster pillar that currently has only 3 internal inbound links.

#### Task 2 — High priority
{same structure}

#### ... (50 tasks)

---

### Orphans ({N} pages)
| URL | Topic cluster | Suggested fix |
|---|---|---|
| {URL} | {cluster} | Add link from {pillar URL} or {related supporting URL} |

### Broken internal links ({N})
| Source page | Broken target | Suggested fix |
|---|---|---|
| {URL} | {URL → 404} | Update to {redirect target} or remove |

---

### Output files
- `audit-{date}.md` — this report
- `tasks-{date}.csv` — all 50 tasks for CMS-team workflow
- `tasks-{date}.json` — same in structured form for programmatic application
- `link-graph-{date}.json` — full crawled graph for diff against future audits
```

### Step 9 — Programmatic application (optional)

For sites where the team trusts the audit: produce a patch file per page that the CMS team or a dev can apply to the source markdown / HTML. The skill never auto-applies — the link insertion text always benefits from human review for tone match.

## What this skill explicitly avoids

- **Stuffing every page with 30 internal links** — over-linking dilutes per-link weight
- **Forcing keyword anchors that read unnaturally** — anchor text must fit the surrounding sentence
- **Adding links between topically-unrelated pages** — pure interlinking for graph density without topical relevance hurts ranking
- **Modifying nav/footer-level links** — those are sitewide; this skill audits in-content links only
- **Removing legitimate links** — even if a page has many links, if they're all topically relevant, leave them. Over-linked is a soft heuristic; manual review for borderline cases.

## Edge Cases

- **JavaScript-rendered site** — fetch may miss links. Use a headless browser or rendered-HTML feed.
- **Multilingual site** — audit per locale separately. Cross-locale internal links are a different motion.
- **Massive site (10,000+ pages)** — sample by traffic/priority; full crawl may be impractical. The skill scales by sampling cluster pillars and their immediate cluster.
- **Programmatic SEO pages** (thousands of similar pages) — handle as a single cluster; auto-link patterns are usually templated.

## Cost

| Component | Cost |
|---|---|
| Site crawl | Free (HTTP fetch only) |
| Topic clustering (TF-IDF + LLM verification) | ~$0.005 per page |
| Issue detection per page | Free (local) |
| Anchor text generation per task | ~$0.005 |
| Report generation | ~$0.05 |
| **Per audit, 200-page site** | **~$2-3** |

## Tools Required

- HTTP fetch + HTML parser
- LLM for clustering verification + anchor text generation
- Optional: headless browser for JS-rendered content
- Optional: site analytics for traffic-weighted priority

## Trigger Phrases

- "Run the internal link audit on {domain}"
- "Find orphan pages"
- "Build internal link map for {topic}"
- "Generate link insertion tasks"
