---
name: reddit-serp-tracker
description: >
  Track whether your Reddit threads earn visibility on Google and in AI answers.
  Uses DataForSEO through the Moatt proxy to (1) check where a Reddit thread ranks
  in Google organic results for target queries, (2) check Google AI Mode, and
  (3) detect when an AI assistant (ChatGPT/Claude/Gemini/Perplexity) cites a
  Reddit URL as a source. No user API keys — billed via Moatt credits.
tags: [seo]
---

# Reddit SERP + AI Citation Tracker

Reddit threads rank well on Google and get pulled into AI answers. This skill
measures both for *your* threads. **You — the agent — drive the flow**, calling
the DataForSEO proxy directly (same pattern as the `aeo` skill). No script.

> **Use the DataForSEO proxy — NOT generic web search.** This task needs real
> Google *ranking positions* and the structured *source/citation arrays* from AI
> engines. A generic web-search tool (e.g. `COMPOSIO_SEARCH_WEB`) gives neither —
> it can't tell you a thread's organic position or whether ChatGPT/Perplexity
> *cited* a reddit.com URL. If you installed this skill you must actually invoke
> it: hit the DFS proxy (Parts A–C below). If you catch yourself reaching for web
> search, stop — that does not satisfy this task and produces a vague,
> position-less answer.

## How the proxy works (verified pattern)

`POST {MOATT_API_BASE}/v1/proxy/dataforseo/rest` with header
`Authorization: Bearer $MOATT_API_KEY`. Body:

```json
{ "endpoint": "/v3/<dfs-endpoint>", "body": [ <task> ] }
```

The proxy forwards to DataForSEO with Moatt's credentials, parses the top-level
`cost`, and deducts Moatt credits at a markup. You never see DFS credentials.
`$MOATT_API_KEY` / `$MOATT_API_BASE` are set by the Box bootstrap.

> **Verify before a paid run.** The `ai_optimization/.../llm_responses/live`
> family is verified live (see `aeo`). The SERP endpoints below are standard DFS
> but confirm the exact request/response shape with ONE cheap call before
> looping — print the raw JSON and read it, don't assume field names.

## Inputs

- **Reddit thread URLs** — the threads you want to track (yours, or competitor
  threads for share-of-voice). **OR just subreddit names**: if the user gives
  subs (r/freelance, r/Payroll) instead of thread URLs, do NOT go scraping
  Reddit to "discover" threads first — that wastes calls and tool steps. The
  SERP and AI responses themselves tell you which Reddit threads surface:
  pull them (Parts A–C below) and match any `reddit.com/r/<sub>/…` URL in the
  results against the user's subs. No reddit-post-finder needed.
- **Target queries** — the searches you care about ("best EOR for contractors",
  "Deel alternatives"). These are what real users / AI engines ask.
- (optional) **Location / language** — default `location_code: 2840` (US),
  `language_code: "en"`.

## Budget your tool calls — ONE script, not one call per request

A full run is `queries × (1 organic + 1 AI-mode + 4 AI providers)` proxy hits.
Issued as separate exec calls that exhausts the chat step budget before you can
report. Instead, write ONE bash script that loops over all queries and
providers, saves every raw response to `/workspace/home/projects/reddit/serp/`
(dated filenames), prints a compact per-call summary line (query, surface,
status, reddit.com URLs found), then run it as ONE exec call (timeout 300000).
Read the printed summary + saved files, then go straight to composing the
output table. Two exec calls total (probe + batch) is the norm; never more
than three.

## Part A — Google organic position

For each query, pull the SERP and look for your Reddit URLs in the results.

```json
// endpoint: /v3/serp/google/organic/live/advanced
[{ "keyword": "best EOR for contractors",
   "location_code": 2840, "language_code": "en",
   "depth": 20 }]
```

- **Keep `depth` low.** DFS moved to depth-based billing in Sept 2025 — cost
  scales with how many result pages you pull. `depth: 20` (top 2 pages) is plenty
  to know if a Reddit thread ranks; only go deeper if you must.
- In the response, scan `tasks[].result[].items[]` for `type == "organic"` whose
  `url` matches (or contains the path of) your tracked thread. Record its
  `rank_absolute` / `rank_group`. Absent from the top `depth` results → record
  "not in top N" (that's a real finding, not an error).

## Part B — Google AI Mode (geo-restricted)

AI Mode is geo-limited (US/UK/India). The DFS AI Mode SERP endpoint lets you
retrieve it regardless of your own location.

```json
// endpoint: /v3/serp/google/ai_mode/live/advanced
[{ "keyword": "<query>", "location_code": 2840, "language_code": "en" }]
```

Read whether the AI Mode answer references/links any of your Reddit threads.
(Confirm this endpoint + its result shape with one probe call first.)

## Part C — AI citation detection (the AEO side)

Ask each model the target query *with web search on* and inspect which URLs it
cited. Reuse the verified `aeo` request:

```json
// endpoint: /v3/ai_optimization/<provider>/llm_responses/live
// providers: chat_gpt | claude | gemini | perplexity
[{ "model_name": "<see aeo table>", "user_prompt": "<query>",
   "web_search": true, "max_output_tokens": 500, "temperature": 0.3 }]
```

Citations live at `tasks[].result[].items[].sections[].annotations[].url`.
**A Reddit URL in that `annotations` array = the model is citing Reddit as a
source for this query.** Check whether any cited URL is one of your tracked
threads (exact) or any `reddit.com` URL (category-level share-of-voice).
(Model IDs + the Gemini `web_search_country_iso_code` caveat: see the `aeo`
skill — don't re-derive them.)

## Output

Date every row (`createdAt`). One table per query:

```markdown
## "best EOR for contractors" — 2026-06-09

| Surface | Result |
|---|---|
| Google organic | r/digitalnomad thread at #6; r/expats not in top 20 |
| Google AI Mode | references the r/digitalnomad thread |
| ChatGPT (web) | cites reddit.com/r/digitalnomad/... ✅ |
| Claude (web) | no Reddit citation |
| Gemini (web) | cites a competitor's blog, no Reddit |
| Perplexity | cites reddit.com/r/Expats/... (not ours) |

**Share of voice:** our threads cited by 1/4 engines; competitor Reddit threads by 1/4.
```

Persist rows to a dated store (e.g. `/workspace/home/projects/reddit/serp/<date>.json`)
so `reddit-visibility-tracker` and the dashboard can build trends over time.

## Cost (before Moatt markup)

| Part | Endpoint | ~Cost |
|---|---|---|
| Google organic | serp/google/organic/live/advanced | ~$0.01–0.05 / query (depth-dependent) |
| Google AI Mode | serp/google/ai_mode/live/advanced | similar |
| AI citation | ai_optimization/*/llm_responses/live (web_search) | ~$0.002–0.07 / (query × provider) |

Keep depth low and the query list focused. State the estimated spend before a
big loop.

## Failure modes

- `402` from the proxy → out of Moatt credits; tell the user to top up, don't retry.
- Non-`20000` `tasks[0].status_code` → DFS rejected the request; log and continue.
- Wrong model ID on the AI side → see the `aeo` model table.

## Dependencies

- DataForSEO via the Moatt proxy; `aeo` skill for the verified LLM-response
  request shape + model IDs.
