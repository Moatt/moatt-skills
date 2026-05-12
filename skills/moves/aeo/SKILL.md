---
name: aeo
description: >
  Check and improve your brand's visibility across AI search engines (ChatGPT, Perplexity, Gemini, Grok, Claude, DeepSeek).
  Set up tracking, run visibility analyses, audit your website for AI readability, and get actionable recommendations.
  Uses the npx moatt-aeo@latest CLI.
tags: [seo]
---

This skill assists a user in measuring and lifting their brand's Answer Engine Optimization (AEO) signal — how often they surface across AI-driven search tools like ChatGPT, Perplexity, Gemini, Grok, Claude, and DeepSeek.

Every action goes through the `npx moatt-aeo@latest` CLI. Pass `--json` consistently so output stays machine-parsable — interactive prompts are not used here.

## Auto-Detect: What Does the User Need?

Inspect the current state before doing anything:

```bash
cat .moatt-aeo.yml 2>/dev/null || echo "NOT_FOUND"
```

Route the conversation based on state and intent:

| State | User says | Action |
|-------|-----------|--------|
| No `.moatt-aeo.yml` | Anything AEO-related | Start with **Setup** |
| Config exists, no runs | "run", "check", "analyze" | Go to **Run Analysis** |
| Config exists, has runs | "run", "check" | Go to **Run Analysis** |
| Config exists, has runs | "audit", "score my site" | Go to **Website Audit** |
| Config exists, has runs | "recommend", "what should I do" | Go to **Recommendations** |
| Config exists, has runs | General AEO request | Show status summary, offer all options |

When the intent is ambiguous, call `npx moatt-aeo@latest status --json` to read the complete state (company name, query count, prior runs) and let the user pick the next step.

---

## Setup

Initialize AEO tracking for a single domain. Walk through the questions conversationally — collect everything you need.

### Gather Information

Collect from the user:
- **Company domain** (e.g., `acme.com`) — required
- **Company name** (e.g., "Acme Inc") — derive from the domain if not given
- **A few competitors** — prompt "Who are your main competitors?" Tell them you can auto-discover if they're unsure.
- **Which AI engines to monitor** — defaults to Perplexity, OpenAI, and Gemini. Confirm whether Grok, Claude, or DeepSeek should be added. More providers means higher run cost.

Hold off on running anything until at least the domain is confirmed.

### Check Prerequisites

Probe which API keys are available in the environment:

```bash
node -e "
const keys = {
  MOATT_AEO_PERPLEXITY_API_KEY: !!process.env.MOATT_AEO_PERPLEXITY_API_KEY,
  MOATT_AEO_OPENAI_API_KEY: !!process.env.MOATT_AEO_OPENAI_API_KEY,
  MOATT_AEO_GEMINI_API_KEY: !!process.env.MOATT_AEO_GEMINI_API_KEY,
  MOATT_AEO_GROK_API_KEY: !!process.env.MOATT_AEO_GROK_API_KEY,
  MOATT_AEO_CLAUDE_API_KEY: !!process.env.MOATT_AEO_CLAUDE_API_KEY,
  MOATT_AEO_DEEPSEEK_API_KEY: !!process.env.MOATT_AEO_DEEPSEEK_API_KEY,
  MOATT_AEO_FIRECRAWL_API_KEY: !!process.env.MOATT_AEO_FIRECRAWL_API_KEY,
};
console.log(JSON.stringify(keys, null, 2));
"
```

Report which keys are configured and which are missing for the providers they picked. If anything is missing, ask the user for the values and append them to `.env`:

```bash
echo 'MOATT_AEO_PERPLEXITY_API_KEY=pplx-...' >> .env
```

Note that `MOATT_AEO_OPENAI_API_KEY` does double duty — it powers query generation and analysis, not only the OpenAI provider tracking. Make this clear to the user.

### Run Init

Assemble flags from the user's answers:

```bash
npx moatt-aeo@latest init \
  --domain <domain> \
  --name "<company name>" \
  --providers <comma-separated-providers> \
  --competitors "<comma-separated-competitor-domains>" \
  --json
```

If competitors weren't supplied, the tool auto-discovers them via Perplexity (provided that API key is configured).

Show the user which competitors and providers ended up in the config. Ask whether the competitor list is right and whether anything needs to be added or removed.

For tweaks, edit `.moatt-aeo.yml` directly — do not re-execute init.

### Generate Queries

Run a small preview batch first:

```bash
npx moatt-aeo@latest queries generate --limit 10 --dry-run --json
```

Display the queries as a numbered list and ask if they look like things real prospects would search for.

If the queries miss the mark, edit the company description in `.moatt-aeo.yml` and re-generate. Individual queries can be added with `npx moatt-aeo@latest queries add "<query text>" --json` or removed with `npx moatt-aeo@latest queries remove <id> --json`.

Once approved, build the full batch:

```bash
npx moatt-aeo@latest queries generate --limit 50 --json
```

### Hand Off

Confirm setup is done and offer to kick off the first analysis. Share an approximate cost: 50 queries × 3 providers comes to roughly $2-5 per run.

---

## Run Analysis

Fire the queries at the configured AI search engines and produce a visibility report.

### Pre-Flight

```bash
npx moatt-aeo@latest status --json
```

Report: company name, total queries, count of prior runs.

### Cost Estimate

```bash
npx moatt-aeo@latest run --dry-run --json
```

Share with the user: query count, the provider list, total API calls, estimated dollar cost. Wait for confirmation before continuing.

### Execute

```bash
npx moatt-aeo@latest run --confirm --json
```

Expect several minutes of runtime. Let the user know it's in progress.

### Analyze

```bash
npx moatt-aeo@latest analyze --json
```

Capture the response count analyzed, analysis cost, and any metric-drop alerts.

### Report

```bash
npx moatt-aeo@latest report --json
```

Present the findings as a **conversational summary** instead of a raw data dump:

- **Overall visibility:** mention rate, prominence score, share of voice
- **By provider:** mention rate broken out by engine
- **Key insights:** strongest/weakest provider, competitor positioning, any alerts that fired
- **Recommendations:** 2-3 concrete next actions

### Next Steps

Offer:
1. **"See the dashboard"** — `npx moatt-aeo@latest dashboard`
2. **"Audit my website"** — kick off the website readability audit
3. **"Get recommendations"** — generate detailed improvement guidance
4. **"Compare with previous run"** — diff against earlier runs when 2+ exist

---

## Website Audit

Crawl the user's site pages and score each one for AI-search readability across 6 dimensions.

### Pre-Flight

```bash
npx moatt-aeo@latest status --json
```

If setup hasn't run yet, send the user back to setup.

### Run Audit

```bash
npx moatt-aeo@latest audit --json
```

Allow a minute or two — the tool fetches pages and scores them one by one.

### Present Results

**Overall score:** "Your site scores X.X / 10 for AI search readability"
- >= 7: well-tuned
- 4-7: improvement opportunities
- < 4: needs substantial work

**Per-page highlights:** the strongest and weakest pages.

**Dimension breakdown** — call out the high and low points:
- **Positioning Clarity**: Does the site say what you do plainly and early?
- **Structured Content**: Are headings, lists, and FAQs in place for AI parsers?
- **Query Alignment**: Does the content match what users ask AI engines?
- **Technical Signals**: Schema markup, clean HTML, meta descriptions?
- **Content Depth**: Enough substance for an AI to cite meaningfully?
- **Comparison Content**: Do you position against alternatives?

**Recommendations:** present as numbered, concrete tasks.

### Offer to Fix

Tie offers to whichever dimension scored lowest:
- Low structuredContent: "Want me to add FAQ sections to your key pages?"
- Low comparisonContent: "Want me to create a comparison page?"
- Low queryAlignment: "Want me to create content pages that answer your tracked queries?"
- Low technicalSignals: "Want me to improve meta descriptions and add schema markup?"
- Low positioningClarity: "Want me to rewrite your homepage intro?"
- Low contentDepth: "Want me to expand content on your thinnest pages?"

---

## Recommendations

Read the latest run and produce concrete steps to improve visibility.

### Pre-Flight

```bash
npx moatt-aeo@latest status --json
```

If no runs exist yet, ask the user to execute an analysis first.

### Generate

```bash
npx moatt-aeo@latest recommend --json
```

### Present Results

**Overall summary:** the high-level state of the brand's AI presence.

**Visibility gaps:** for each gap — the topic, the queries impacted, which competitors get cited instead, and the specific recommendation.

**Source opportunities:** the domains AI engines cite often, how frequently, and tactics for showing up there.

**Competitor insights:** who's outperforming on which queries and the likely reasons.

### Offer Next Steps

1. **"Draft content for gaps"** — blog posts, landing pages, or FAQ content addressing visibility gaps
2. **"Create a comparison page"** — build a vs/comparison page when competitors are stealing mentions
3. **"Write a guest post pitch"** — draft outreach targeting source-opportunity domains
4. **"Update queries"** — add new query angles the recommendations imply
5. **"See the dashboard"** — `npx moatt-aeo@latest dashboard` for visual exploration

---

## Error Handling

- **"No company found" / no `.moatt-aeo.yml`**: route to setup.
- **"MOATT_AEO_OPENAI_API_KEY is required"**: tell the user to set it — required for query generation, analysis, and recommendations.
- **Provider API key missing**: name the key and explain how to add it.
- **No pages scraped during audit**: verify the domain in `.moatt-aeo.yml` and confirm the site is publicly reachable.
- **All-zero visibility**: explain this is the baseline state — AI engines haven't picked up the brand yet, and improvement starts from here.
- **Partial run failure**: some providers may have succeeded. Surface the error count and identify which failed.
- Never silently absorb errors — display them and propose a fix.
