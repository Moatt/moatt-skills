---
name: aeo
description: >
  Check and improve a brand's visibility across AI search engines (ChatGPT,
  Claude, Gemini, Perplexity). Calls DataForSEO's AI Optimization endpoints
  through the Moatt proxy — no user API keys required, billed via Moatt
  credits. Verified live 2026-05-24.
tags: [seo, aeo, geo, llm]
---

# AEO — Answer Engine Optimization

Measure how often a brand is mentioned by AI assistants when prospects ask
relevant questions, and lift that share of voice. You — the agent — drive the
whole flow. No bash wrappers, no `extract_completion` helpers — call the proxy
directly, read JSON, count mentions, write the report.

## How it works in one paragraph

`POST {MOATT_API_BASE}/v1/proxy/dataforseo/rest` with `Authorization:
Bearer $MOATT_API_KEY` forwards to DataForSEO. Body is
`{endpoint: "/v3/ai_optimization/<provider>/llm_responses/live", body: [<task>]}`.
DFS asks the named LLM (with optional `web_search:true`) and returns its
completion text. You loop your prospect queries × 4 providers, read the
completions, count brand and competitor mentions, write a report.

The proxy auth model means **you never see DataForSEO credentials and the
user never supplies OpenAI/Anthropic/Google/Perplexity API keys**. Every call
deducts Moatt credits from the org's balance.

## Working models (verified 2026-05-24)

DO NOT use the old model IDs — most are rejected. Use these:

| Provider | `model_name` | Notes |
|---|---|---|
| `chat_gpt` | `gpt-4o` | Cheapest, ~$0.002/call |
| `claude` | `claude-sonnet-4-0` | ~$0.07/call (with web_search). `claude-opus-4-0` works but is 5× pricier. `claude-3-*` IDs are all rejected. |
| `gemini` | `gemini-2.0-flash` | ~$0.07/call. `gemini-1.5-pro` is rejected. `gemini-2.5-pro` returns only chain-of-thought, useless for mention measurement. |
| `perplexity` | `sonar` (or `sonar-pro`) | ~$0.006/call. `sonar-reasoning` is rejected. |

Budget rule of thumb: **20 prospect queries × 4 providers ≈ $3.00** with
`web_search:true` on every call. Without web_search costs drop ~10× but you
lose the whole AEO signal — the model just answers from training data.

## Request body

```json
[{
  "model_name": "<see table>",
  "user_prompt": "<the prospect query>",
  "max_output_tokens": 500,
  "temperature": 0.3,
  "web_search": true
}]
```

Optional: `"web_search_country_iso_code": "US"` works for `chat_gpt`, `claude`,
`perplexity`. **Gemini rejects it with `40501`** — omit the field for Gemini.
`message_chain` and `system_message` are optional; not needed for AEO probes.

## Response shape (all 4 providers, identical)

```jsonc
{
  "status_code": 20000,
  "tasks": [{
    "status_code": 20000,
    "cost": 0.04,                  // USD before Moatt markup
    "result": [{
      "items": [{
        "type": "message",
        "sections": [
          { "type": "text", "text": "...the answer...", "annotations": [...] },
          // Claude sometimes returns multiple text sections — join them.
          // Gemini-2.5-pro returns "summary_text" (chain-of-thought) instead — filter those OUT.
        ]
      }]
    }]
  }]
}
```

To get the completion text:
```
all sections where section.type == "text", joined with a space
```
Skip `summary_text` and any other type — they're not the final answer.

Citations (when present) live at `sections[].annotations[].url`. Useful for
the audit step.

Error envelope: a non-20000 `tasks[0].status_code` means DFS rejected the
request. Common codes:
- `40501 Invalid Field: 'model_name'` → wrong model ID, see table above
- `40501 Invalid Field: 'web_search_country_iso_code'` → drop the field for Gemini
- `402` from the proxy → out of Moatt credits, tell user to top up
- `503 vendor_misconfigured` → infra issue, ping support

## Protocol — the agent flow

State lives in two files in the workspace:
- `/workspace/home/.moatt-aeo.json` — `{domain, company, competitors, providers, queries, created_at}`
- `/workspace/home/projects/aeo-<YYYY-MM-DD>/` — per-run output dir with `responses/`, `report.json`, optionally `audit.json` and `recommendations.json`

### Step 1 — Status check

Read `.moatt-aeo.json` (if missing → not initialized). Tell the user which
phase they're in: setup / first run / re-run / audit / recommend.

### Step 2 — Setup

Collect from the user:
- **Company domain** (required)
- **Company name** (derive from domain if omitted)
- **Competitors** (5–10 domains). If the user can't list them, fetch
  `https://<domain>` first and read the title + meta description, THEN
  propose competitors from your own knowledge of the space, THEN ask
  the user to confirm. **Do NOT** rely on a `<company> alternatives` SERP
  — it returns irrelevant domains for niche brands.
- **Providers** — default to all 4. Drop one only if cost is a stated concern.

Save the config and confirm it back to the user before spending.

### Step 3 — Generate prospect queries

Generate 10–20 queries yourself, no LLM round-trip needed (you're already an
LLM). Mix of:
- **Problem-aware** (3–5): "how do I automate data sync between CRM and
  accounting"
- **Solution-aware** (3–5): "best workflow automation platforms for SMBs"
- **Comparison** (2–4): "Zapier vs Workato"
- **Branded** (1–2): "what is <company>" — use this as a sanity check. If you
  don't show up on a branded query, the AI assistant doesn't know you exist
  on the web yet, which is the real diagnosis.

Show the user the numbered list and let them edit before running.

### Step 4 — Run

For each `(query, provider)` pair, POST to the proxy and save the raw JSON
to `responses/<provider>-q<n>.json`. Use the model IDs above. Use
`web_search: true`. Include `web_search_country_iso_code` for everyone
EXCEPT Gemini.

You can fan out concurrently — DFS handles parallel requests fine. ~8
concurrent is safe. Each call is 5–30s depending on provider and whether
web_search needs to wait on retrieval.

If `tasks[0].status_code != 20000`, log the message and continue — don't
crash the whole run for one bad response.

### Step 5 — Analyze

For each saved response:
1. Extract completion text (join `sections[]` where `type == "text"`).
2. Check if it mentions the brand. **Use context-aware matching**, not naive
   substring — many short brand names collide with other companies. Rule:
   case-insensitive contains `<domain>`, OR contains brand name AND
   contains at least one category word from the brand's tagline (e.g.
   "automation", "integration", "workflow").
3. Check each competitor with a simple case-insensitive substring match
   on the competitor's domain or product name.
4. Optionally check for **brand confusion** — substring of brand name but
   NONE of your category words. Surface these — they're often a different
   company stealing your name in AI answers.

Output `report.json` with:
- `overall.brand_strict_rate` — `% of completions containing <domain>` exactly
- `overall.brand_contextual_rate` — % matching the context-aware rule
- `overall.confusion_rate` — % matching brand name in wrong context
- `by_provider[]` — same metrics per provider, plus `cost`, `avg_text_len`
- `competitors[]` — sorted by mention count
- `brand_quotes[]` — first 5 verbatim snippets where the brand was mentioned in-context
- `confusion_quotes[]` — first 5 snippets where the name was used wrong

### Step 6 — Report to user

Present a **conversational summary**, not a JSON dump. Cover:
- Overall visibility (strict %, contextual %)
- Strongest and weakest provider
- Top 3 competitors winning the share-of-voice
- Whether you only appear on branded queries (this is the most common bad pattern — call it out plainly)
- Whether there's brand confusion (substring matches that aren't actually the brand)
- 2–3 concrete next actions tied to the data

Then tell the user where the full JSON lives.

## Optional — Website audit

If the user asks "audit my site" / "what should I fix on the site":

1. Fetch the brand's homepage and 2–3 deep pages.
2. For each page, send the text content to `chat_gpt/llm_responses/live`
   asking GPT to score on 6 dimensions:
   - positioning_clarity (does the page state what the company does in <2 sentences?)
   - structured_content (headings/lists/FAQs the parser can chunk)
   - query_alignment (does the page answer what prospects search for?)
   - technical_signals (schema, meta, clean HTML)
   - content_depth (enough to cite meaningfully)
   - comparison_content (does the site own its "vs competitor" pages?)
3. Return scores 0–10 per dimension + per-page averages + an overall.

## Optional — Recommendations

If the user says "what should I do" after a run:
Take the `report.json` and produce 3–5 prioritized actions. You can do this
inline (you're an LLM) — no need to round-trip to Claude/GPT via DFS for it.
Each action: `{title, priority, rationale (tied to a specific data point in
report.json), action}`.

## Common failure modes — and what to do

| Symptom | Cause | Fix |
|---|---|---|
| `40501 Invalid Field: 'model_name'` | Old model ID | Use the table above |
| `40501 Invalid Field: 'web_search_country_iso_code'` | Gemini doesn't accept it | Drop the field for Gemini calls |
| `402 insufficient_credits` from proxy | Out of Moatt credits | Tell user to top up; do NOT retry |
| Empty completion text | `summary_text`-only response (Gemini 2.5 Pro) or model returned 0 sections | Switch to `gemini-2.0-flash`; treat as no mention but count separately as `errors[]` |
| Brand mentioned but it's wrong (different company same name) | Substring collision | Context-aware matching: require brand name + at least one category word |
| Zero mentions on every query including branded ones | Model genuinely doesn't know the brand | This IS the AEO finding. Recommend listicle outreach + own-domain comparison pages |

## Dependencies

- The Box has `curl` and `jq` available. If `jq` is missing, do the JSON
  work in the agent layer instead — every transformation in this skill is
  small enough to handle natively without shelling out.
- `$MOATT_API_KEY` and `$MOATT_API_BASE` set by the Box bootstrap.
- The DataForSEO `/v3/ai_optimization/*` family — verified live 2026-05-24.

## When to use this skill

- "Check my AEO" / "where do I show up in ChatGPT" / "answer engine
  optimization" / "Perplexity visibility" / "LLM mentions" → this skill.
- Classical Google SERP audit, backlinks, on-page health → use `seo-audit`.
- Full competitive content gap matrix → `seo-content-audit`, then this
  skill as the complement.

## Cost reference

| Phase | DFS endpoints | Approx cost (before Moatt markup) |
|---|---|---|
| Setup (no SERP) | 0 | $0 |
| 20 queries × 4 providers, web_search on | 80× LLM responses | ~$3.00 |
| Site audit (4 pages) | 1× on_page + 4× LLM | ~$0.30 |
| Recommendations | 0 (agent does it inline) | $0 |
