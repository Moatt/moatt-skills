---
name: aeo
description: >
  Check and improve your brand's visibility across AI search engines (ChatGPT,
  Claude, Gemini, Perplexity). Powered by DataForSEO's AI Optimization endpoints
  through the Moatt proxy — no user API keys required. Sets up tracking, runs
  visibility analyses, audits the site for AI-readability, and produces
  actionable recommendations. Pay-per-use, ~$0.10–0.50 per analysis run.
tags: [seo, aeo, geo, llm]
---

# AEO — Answer Engine Optimization

Measure and lift your brand's visibility across AI-driven search tools
(ChatGPT, Claude, Gemini, Perplexity). Every call routes through the Moatt
DataForSEO proxy — the user never supplies a Perplexity / OpenAI / Anthropic
API key.

## Steps

This recipe runs through `boxExec` only. Write the script once into
`/workspace/home/.skills-cache/aeo/aeo.sh`, then invoke its subcommands.
**Do NOT try `bash /workspace/skills/...` — that path is sandboxed and
unreachable to `boxExec`.**

1. Confirm `$MOATT_API_KEY` and `$MOATT_API_BASE` are set in the Box env
   (they are by default, sourced from `/tmp/moatt-env.sh`).
2. Write the recipe to `/workspace/home/.skills-cache/aeo/aeo.sh` via
   `boxWrite` exactly once per session. The body is the bash script reproduced
   at the bottom of this SKILL.md under "## scripts/aeo.sh" — copy it verbatim.
3. Read state first: `bash /workspace/home/.skills-cache/aeo/aeo.sh status`.
   The script prints JSON with `configured` (bool), `company`, `domain`,
   `providers`, `query_count`, and `run_count`.

## Auto-Detect — what does the user need?

Route based on `status` output and the user's intent:

| State | User says | Action |
|---|---|---|
| `configured: false` | Anything AEO | Run **Setup** |
| `configured, run_count == 0` | "run", "check", "analyze" | Run **Analysis** |
| `configured, run_count >= 1` | "run", "check" | Run **Analysis** (new run) |
| `configured, run_count >= 1` | "audit", "score my site" | Run **Website Audit** |
| `configured, run_count >= 1` | "recommend", "what should I do" | Run **Recommendations** |

## Setup

Collect from the user:
- **Company domain** (required) — strip scheme/path, lowercase.
- **Company name** — derive from domain if not given.
- **Competitors** — comma-separated domains; leave empty to auto-discover.
- **Providers** — defaults to `chat_gpt,claude,gemini,perplexity`. Confirm only
  if the user wants to drop one to cut cost. Each extra provider multiplies
  the run cost linearly.

Run:

```bash
bash /workspace/home/.skills-cache/aeo/aeo.sh init \
  --domain <domain> \
  --name "<company name>" \
  --providers chat_gpt,claude,gemini,perplexity \
  --competitors "<comma-separated-domains-or-empty>"
```

This writes `/workspace/home/.moatt-aeo.json`. If competitors were empty, the
script discovers up to 5 via a DataForSEO SERP call on `"<company> alternatives"`.

Show the user the resulting config (company, competitors, providers) and ask
whether the competitor list looks right. If not, just re-run `init` — the file
gets overwritten.

Then generate the query batch:

```bash
bash /workspace/home/.skills-cache/aeo/aeo.sh queries --limit 10 --dry-run
```

Read the dry-run output (a JSON array of suggested queries), present them as a
numbered list, ask if they look like things real prospects would search for.
Once approved:

```bash
bash /workspace/home/.skills-cache/aeo/aeo.sh queries --limit 50
```

This appends 50 final queries to `.moatt-aeo.json`. Approximate cost: 50 queries
× 4 providers ≈ $0.30–0.80 per full run depending on `web_search` usage.

## Run Analysis

```bash
bash /workspace/home/.skills-cache/aeo/aeo.sh run
```

Iterates every `(query, provider)` pair, calling the DataForSEO LLM responses
live endpoints with `web_search: true`. Saves each completion JSON to
`/workspace/home/projects/aeo-<YYYY-MM-DD>/responses/<provider>-<query-id>.json`.

Expect several minutes — many serial calls. The script prints progress to
stderr every 5 calls.

Then:

```bash
bash /workspace/home/.skills-cache/aeo/aeo.sh analyze
```

Pure local jq — counts mentions of the company name and each competitor in
every saved completion. Writes
`/workspace/home/projects/aeo-<YYYY-MM-DD>/analyze.json` containing:

- `overall.mention_rate` — % of completions naming the company
- `overall.share_of_voice` — company mentions ÷ all brand mentions
- `by_provider[]` — same metrics broken out by chat_gpt / claude / gemini / perplexity
- `competitors[]` — each competitor's mention_rate (descending)
- `top_quotes[]` — first 3 verbatim sentences where the company is named

Present the report as a **conversational summary** — overall visibility,
strongest/weakest provider, top competitor that's outperforming, 2–3 concrete
next actions. Then tell the user the full JSON path so they can open it.

## Website Audit

```bash
bash /workspace/home/.skills-cache/aeo/aeo.sh audit
```

Crawls the homepage and up to 3 deep pages via DataForSEO's on-page lighthouse
endpoint, then sends each page's text to `chat_gpt/llm_responses/live` asking
GPT to score it across 6 dimensions:

1. **Positioning Clarity** — does the page say what the company does plainly and early?
2. **Structured Content** — headings, lists, FAQs an AI parser can chunk?
3. **Query Alignment** — content matches what users ask AI engines?
4. **Technical Signals** — schema, clean HTML, meta descriptions?
5. **Content Depth** — enough substance for an AI to cite meaningfully?
6. **Comparison Content** — does the site position against alternatives?

Writes `audit.json` with per-page scores and an overall 0–10 readability number.
Score interpretation: ≥7 well-tuned, 4–7 has opportunities, <4 needs work.

After presenting results, offer to fix the lowest-scoring dimension via a
follow-up content task (rewrite homepage intro / add FAQ / build comparison page
etc).

## Recommendations

```bash
bash /workspace/home/.skills-cache/aeo/aeo.sh recommend
```

Reads the most recent `analyze.json`, passes the metrics + a list of queries
where the company lost mentions to `claude/llm_responses/live`, and writes
`recommendations.json` with 3–5 prioritized actions tied to the data (visibility
gaps, source-opportunity domains, competitor outperformance).

Present them as a numbered list with one-line justifications. Offer next steps:
draft content for gaps, create comparison page, write guest-post pitch, update
queries.

## Cost

| Phase | DataForSEO endpoints | Est. cost (after 20% Moatt markup) |
|---|---|---|
| `init` (with discovery) | 1× SERP organic | ~$0.005 |
| `queries --limit 50` | 1× LLM responses + 1× keyword search volume | ~$0.01 |
| `run` (50 queries × 4 providers) | 200× LLM responses live | ~$0.30–0.80 |
| `audit` | 1× on_page lighthouse + 4× LLM responses | ~$0.05 |
| `recommend` | 1× LLM responses | ~$0.001 |

All metered against the user's Moatt credit balance. No raw API keys touched.

## Error handling

- **`MOATT_API_KEY not set`** — Box env wasn't bootstrapped; the user should
  refresh the chat. Don't try to set it manually.
- **Proxy returns 402 `insufficient_credits`** — surface the balance from the
  error and tell the user to top up at `/settings/billing`. Don't retry.
- **Proxy returns 503 `vendor_misconfigured`** — DataForSEO creds aren't set on
  the Moatt side. Surface verbatim and tell the user to ping support; this is
  not a skill bug.
- **Provider returns empty/malformed completion** — the analyzer treats it as
  "no mention", counts it, and continues. The `analyze.json.errors[]` array
  lists per-provider failure counts.
- **`.moatt-aeo.json` missing during `run`/`analyze`/`audit`/`recommend`** —
  route the user back to **Setup**.

Never silently absorb errors — display the proxy's JSON error verbatim and
propose the fix above.

## When to use this skill

- User says "check my AEO" / "where do I show up in ChatGPT?" / "Perplexity
  visibility" / "answer engine optimization" → this skill.
- User wants the **classical SEO snapshot** (Google ranks, backlinks, on-page
  health) → use `seo-analyzer` or `seo-content-audit` instead.
- User wants the **full audit + competitive content gap matrix** → use
  `seo-content-audit`; AEO is a complement, not a replacement.

## Dependencies

- `curl` + `jq` (already in the Box).
- `$MOATT_API_KEY` and `$MOATT_API_BASE` in env (already set by Box bootstrap).
- DataForSEO `/v3/ai_optimization/*` family — verified live as of 2026-05.

## scripts/aeo.sh

The full recipe. Write this verbatim to
`/workspace/home/.skills-cache/aeo/aeo.sh` via `boxWrite`, then `boxExec` to run
each subcommand.

```bash
#!/usr/bin/env bash
# aeo.sh — Answer Engine Optimization recipe via the Moatt DataForSEO proxy.
# Subcommands: status | init | queries | run | analyze | audit | recommend
#
# Requires (already set by Box env via /tmp/moatt-env.sh):
#   $MOATT_API_KEY   — Bearer token for the Moatt proxy
#   $MOATT_API_BASE  — e.g. https://app.moatt.com (NO trailing slash)

set -uo pipefail

CONFIG_PATH="/workspace/home/.moatt-aeo.json"
PROXY_BASE_PATH="/api/v1/proxy/dataforseo/rest"

if [ -z "${MOATT_API_KEY:-}" ] || [ -z "${MOATT_API_BASE:-}" ]; then
  echo '{"error":"missing_credentials","message":"MOATT_API_KEY and MOATT_API_BASE must be set"}' >&2
  exit 3
fi
PROXY="${MOATT_API_BASE%/}${PROXY_BASE_PATH}"

log() { echo "[aeo] $*" >&2; }

# POST a DFS task. $1 = endpoint, $2 = JSON body string (a task array).
dfs() {
  local endpoint="$1" body="$2"
  curl -sS -X POST "$PROXY" \
    -H "Authorization: Bearer $MOATT_API_KEY" \
    -H "Content-Type: application/json" \
    --max-time 180 \
    -d "$(jq -nc --arg ep "$endpoint" --argjson b "$body" '{endpoint:$ep, body:$b}')"
}

# Ask a single LLM via DFS. $1 = provider (chat_gpt|claude|gemini|perplexity)
# $2 = user_prompt, $3 = system_message ("" for none), $4 = web_search_country (e.g. "US"|"")
llm_ask() {
  local provider="$1" prompt="$2" sysmsg="$3" country="$4"
  local model endpoint
  case "$provider" in
    chat_gpt)   model="gpt-4o";          endpoint="/v3/ai_optimization/chat_gpt/llm_responses/live" ;;
    claude)     model="claude-opus-4-0"; endpoint="/v3/ai_optimization/claude/llm_responses/live" ;;
    gemini)     model="gemini-1.5-pro";  endpoint="/v3/ai_optimization/gemini/llm_responses/live" ;;
    perplexity) model="sonar-reasoning"; endpoint="/v3/ai_optimization/perplexity/llm_responses/live" ;;
    *) echo "{\"error\":\"unknown_provider\",\"provider\":\"$provider\"}"; return 1 ;;
  esac
  local body
  body=$(jq -nc \
    --arg model "$model" \
    --arg prompt "$prompt" \
    --arg sysmsg "$sysmsg" \
    --arg country "$country" \
    '[
      ($sysmsg | if . == "" then null else . end) as $sys
      | ($country | if . == "" then null else . end) as $cc
      | {
          model_name: $model,
          user_prompt: $prompt,
          message_chain: [{role:"user", message:$prompt}],
          max_output_tokens: 600,
          temperature: 0.3,
          web_search: true
        }
      | (if $sys  then .system_message = $sys                  else . end)
      | (if $cc   then .web_search_country_iso_code = $cc      else . end)
     ]')
  dfs "$endpoint" "$body"
}

# Extract the completion text from a provider response (each provider's shape differs)
extract_completion() {
  local provider="$1" json="$2"
  case "$provider" in
    chat_gpt)
      echo "$json" | jq -r '.tasks_data[0].result[0].message.message // .tasks[0].result[0].items[0].message.message // ""'
      ;;
    claude)
      echo "$json" | jq -r '.tasks[0].data.generated_text // .tasks[0].result[0].items[0].generated_text // ""'
      ;;
    gemini)
      echo "$json" | jq -r '.tasks[0].result[0].response // .tasks[0].result[0].items[0].response // ""'
      ;;
    perplexity)
      echo "$json" | jq -r '.tasks[0].result_json.completion // .tasks[0].result[0].items[0].completion // ""'
      ;;
  esac
}

cmd_status() {
  if [ ! -f "$CONFIG_PATH" ]; then
    jq -nc '{configured:false, company:null, domain:null, providers:[], query_count:0, run_count:0}'
    return
  fi
  local run_count
  run_count=$(find /workspace/home/projects -maxdepth 1 -type d -name 'aeo-*' 2>/dev/null | wc -l | tr -d ' ')
  jq --argjson rc "${run_count:-0}" '. + {configured:true, query_count: ((.queries // []) | length), run_count:$rc}' "$CONFIG_PATH"
}

cmd_init() {
  local domain="" name="" providers="chat_gpt,claude,gemini,perplexity" competitors=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --domain)      domain="$2"; shift 2 ;;
      --name)        name="$2"; shift 2 ;;
      --providers)   providers="$2"; shift 2 ;;
      --competitors) competitors="$2"; shift 2 ;;
      *) echo "{\"error\":\"unknown_flag\",\"flag\":\"$1\"}" >&2; exit 2 ;;
    esac
  done
  [ -z "$domain" ] && { echo '{"error":"missing_domain"}' >&2; exit 2; }
  domain="$(echo "$domain" | sed -E 's#^https?://##; s#/.*$##; s#/$##' | tr '[:upper:]' '[:lower:]')"
  [ -z "$name" ] && name="$(echo "$domain" | sed -E 's#\.[a-z]+$##' | sed -E 's#^.#\U&#')"

  local competitors_json="[]"
  if [ -n "$competitors" ]; then
    competitors_json=$(echo "$competitors" | jq -Rc 'split(",") | map(gsub("^\\s+|\\s+$"; "")) | map(select(length > 0))')
  else
    log "init: discovering competitors via SERP for \"$name alternatives\""
    local serp_body serp_json
    serp_body=$(jq -nc --arg kw "$name alternatives" '[{keyword:$kw, location_code:2840, language_code:"en", depth:10}]')
    serp_json="$(dfs "/v3/serp/google/organic/live/advanced" "$serp_body")"
    competitors_json=$(echo "$serp_json" | jq -c --arg d "$domain" '
      [.tasks[0].result[0].items[]?
        | select(.type == "organic")
        | .domain
        | select(. != null and . != $d and (. | test("(wikipedia|reddit|youtube|quora|linkedin|forbes|g2|capterra)") | not))
      ] | unique | .[0:5]
    ' 2>/dev/null || echo '[]')
    [ "$competitors_json" = "null" ] && competitors_json='[]'
  fi

  local providers_json
  providers_json=$(echo "$providers" | jq -Rc 'split(",") | map(gsub("^\\s+|\\s+$"; ""))')

  jq -n \
    --arg domain "$domain" \
    --arg name "$name" \
    --argjson competitors "$competitors_json" \
    --argjson providers "$providers_json" \
    --arg created_at "$(date -u +%FT%TZ)" \
    '{domain:$domain, company:$name, competitors:$competitors, providers:$providers, queries:[], created_at:$created_at}' \
    > "$CONFIG_PATH"

  jq '.' "$CONFIG_PATH"
}

cmd_queries() {
  local limit=50 dry_run=0
  while [ $# -gt 0 ]; do
    case "$1" in
      --limit)   limit="$2"; shift 2 ;;
      --dry-run) dry_run=1; shift ;;
      *) echo "{\"error\":\"unknown_flag\",\"flag\":\"$1\"}" >&2; exit 2 ;;
    esac
  done
  [ ! -f "$CONFIG_PATH" ] && { echo '{"error":"not_initialized","message":"run init first"}' >&2; exit 2; }

  local company domain competitors_str
  company=$(jq -r '.company' "$CONFIG_PATH")
  domain=$(jq -r '.domain' "$CONFIG_PATH")
  competitors_str=$(jq -r '.competitors | join(", ")' "$CONFIG_PATH")

  local prompt
  prompt="You generate realistic search queries that prospects type into AI assistants like ChatGPT or Perplexity when they have a problem your product solves. The company is \"$company\" (domain: $domain). Known competitors: $competitors_str. Generate exactly $limit short, natural prospect queries (3–10 words each) — a mix of problem-aware, solution-aware, comparison, and intent-style queries. Return ONLY a JSON array of strings, no commentary, no markdown."

  log "queries: asking chat_gpt for $limit prospect queries"
  local resp completion queries_json
  resp=$(llm_ask "chat_gpt" "$prompt" "Respond with ONLY a JSON array of strings." "")
  completion=$(extract_completion "chat_gpt" "$resp")
  queries_json=$(echo "$completion" | sed -E 's/^```(json)?//; s/```$//' | jq -c '
    if type == "array" then . else [] end
    | map(select(type == "string" and length > 0))
  ' 2>/dev/null || echo '[]')

  if [ "$queries_json" = "[]" ] || [ "$queries_json" = "null" ]; then
    echo "{\"error\":\"query_generation_failed\",\"raw_response\":$(echo "$resp" | jq -c .)}" >&2
    exit 4
  fi

  if [ "$dry_run" -eq 1 ]; then
    echo "$queries_json"
    return
  fi

  local with_ids
  with_ids=$(echo "$queries_json" | jq -c 'to_entries | map({id: ("q" + ((.key + 1) | tostring)), query: .value})')

  local tmp
  tmp=$(mktemp)
  jq --argjson q "$with_ids" '.queries = $q' "$CONFIG_PATH" > "$tmp" && mv "$tmp" "$CONFIG_PATH"

  jq -nc --argjson q "$with_ids" '{appended: ($q | length), queries: $q}'
}

cmd_run() {
  [ ! -f "$CONFIG_PATH" ] && { echo '{"error":"not_initialized"}' >&2; exit 2; }
  local company domain providers queries date_stamp out_dir
  company=$(jq -r '.company' "$CONFIG_PATH")
  domain=$(jq -r '.domain' "$CONFIG_PATH")
  providers=$(jq -r '.providers[]' "$CONFIG_PATH")
  date_stamp=$(date +%F)
  out_dir="/workspace/home/projects/aeo-${date_stamp}"
  mkdir -p "$out_dir/responses"

  local total done_count=0 errors_count=0
  total=$(jq '(.queries | length) * (.providers | length)' "$CONFIG_PATH")
  log "run: $total LLM calls (company=$company, out=$out_dir)"

  jq -r '.queries[] | .id + "\t" + .query' "$CONFIG_PATH" | while IFS=$'\t' read -r qid qtext; do
    for provider in $providers; do
      local resp_file="$out_dir/responses/${provider}-${qid}.json"
      if [ -f "$resp_file" ]; then
        done_count=$((done_count + 1))
        continue
      fi
      local resp completion
      resp=$(llm_ask "$provider" "$qtext" "" "US")
      completion=$(extract_completion "$provider" "$resp")
      jq -nc \
        --arg provider "$provider" \
        --arg qid "$qid" \
        --arg query "$qtext" \
        --arg completion "$completion" \
        --argjson raw "$resp" \
        '{provider:$provider, query_id:$qid, query:$query, completion:$completion, raw:$raw}' \
        > "$resp_file"
      done_count=$((done_count + 1))
      [ -z "$completion" ] && errors_count=$((errors_count + 1))
      if [ $((done_count % 5)) -eq 0 ]; then
        log "run: $done_count / $total ($errors_count empty)"
      fi
    done
  done

  jq -nc --arg out "$out_dir" --argjson total "$total" '{out_dir:$out, total_calls:$total}'
  echo "$out_dir"
}

cmd_analyze() {
  [ ! -f "$CONFIG_PATH" ] && { echo '{"error":"not_initialized"}' >&2; exit 2; }
  local date_stamp out_dir
  date_stamp=$(date +%F)
  out_dir="/workspace/home/projects/aeo-${date_stamp}"
  if [ ! -d "$out_dir/responses" ]; then
    out_dir=$(find /workspace/home/projects -maxdepth 1 -type d -name 'aeo-*' 2>/dev/null | sort | tail -1)
  fi
  [ -z "$out_dir" ] || [ ! -d "$out_dir/responses" ] && { echo '{"error":"no_run_found"}' >&2; exit 2; }

  local company competitors_json providers_json
  company=$(jq -r '.company' "$CONFIG_PATH")
  competitors_json=$(jq -c '.competitors' "$CONFIG_PATH")
  providers_json=$(jq -c '.providers' "$CONFIG_PATH")

  local responses_blob
  responses_blob=$(cat "$out_dir/responses/"*.json | jq -sc '.')

  jq -n \
    --arg company "$company" \
    --argjson competitors "$competitors_json" \
    --argjson providers "$providers_json" \
    --argjson rs "$responses_blob" \
    '
    def mentions($text; $needle):
      if ($text | type) != "string" or ($needle | length) == 0 then 0
      elif ($text | ascii_downcase | contains($needle | ascii_downcase)) then 1
      else 0 end;

    def stem($d):
      $d | ascii_downcase | gsub("\\.(com|io|ai|co|net|org).*$"; "");

    ($company | ascii_downcase) as $brand
    | {
        company: $company,
        total_responses: ($rs | length),
        providers: $providers,
        overall: {
          mention_rate: (
            ($rs | map(mentions(.completion; $brand)) | add // 0) as $hits
            | if ($rs | length) > 0 then ($hits / ($rs | length)) else 0 end
          ),
          share_of_voice: (
            ($rs | map(mentions(.completion; $brand)) | add // 0) as $brand_hits
            | ($competitors | map(stem(.) as $c | $rs | map(mentions(.completion; $c)) | add // 0) | add // 0) as $comp_hits
            | if ($brand_hits + $comp_hits) > 0 then ($brand_hits / ($brand_hits + $comp_hits)) else 0 end
          )
        },
        by_provider: [
          $providers[] as $p
          | ($rs | map(select(.provider == $p))) as $sub
          | {
              provider: $p,
              n: ($sub | length),
              mention_rate: (
                ($sub | map(mentions(.completion; $brand)) | add // 0) as $h
                | if ($sub | length) > 0 then ($h / ($sub | length)) else 0 end
              )
            }
        ],
        competitors: [
          $competitors[]
          | . as $c
          | stem($c) as $s
          | {
              competitor: $c,
              mention_rate: (
                ($rs | map(mentions(.completion; $s)) | add // 0) as $h
                | if ($rs | length) > 0 then ($h / ($rs | length)) else 0 end
              )
            }
        ] | sort_by(-.mention_rate),
        top_quotes: [
          $rs[]
          | select(mentions(.completion; $brand) == 1)
          | {
              provider, query,
              quote: ((.completion | split(". ") | map(select(ascii_downcase | contains($brand))))[0] // "")
            }
        ] | .[0:3],
        errors: {
          empty_completions: ($rs | map(select(.completion == "")) | length)
        }
      }
    ' > "$out_dir/analyze.json"

  echo "$out_dir/analyze.json"
}

cmd_audit() {
  [ ! -f "$CONFIG_PATH" ] && { echo '{"error":"not_initialized"}' >&2; exit 2; }
  local domain company date_stamp out_dir
  domain=$(jq -r '.domain' "$CONFIG_PATH")
  company=$(jq -r '.company' "$CONFIG_PATH")
  date_stamp=$(date +%F)
  out_dir="/workspace/home/projects/aeo-${date_stamp}"
  mkdir -p "$out_dir"

  local urls=("https://$domain" "https://$domain/about" "https://$domain/pricing" "https://$domain/features")
  local per_page='[]'
  for url in "${urls[@]}"; do
    log "audit: scoring $url"
    local instant_body instant_json page_text score_prompt score_resp score_completion score_json
    instant_body=$(jq -nc --arg u "$url" '[{url:$u, enable_javascript:true, custom_user_agent:"Mozilla/5.0 (compatible; AEO-Audit)"}]')
    instant_json="$(dfs "/v3/on_page/instant_pages" "$instant_body")"
    page_text=$(echo "$instant_json" | jq -r '.tasks[0].result[0].items[0].page_content // ""' | head -c 4000)
    [ -z "$page_text" ] && { log "audit: skipping $url (no content)"; continue; }

    score_prompt="You are auditing the AI-search readability of a webpage for the company \"$company\". Score the page from 0–10 on each of these 6 dimensions: positioning_clarity, structured_content, query_alignment, technical_signals, content_depth, comparison_content. Return ONLY a JSON object with those 6 numeric fields plus an \"overall\" average and a \"notes\" string (max 200 chars). Page text follows.\n\n---\n$page_text\n---"
    score_resp=$(llm_ask "chat_gpt" "$score_prompt" "Respond with ONLY a JSON object." "")
    score_completion=$(extract_completion "chat_gpt" "$score_resp")
    score_json=$(echo "$score_completion" | sed -E 's/^```(json)?//; s/```$//' | jq -c '.' 2>/dev/null || echo '{}')
    per_page=$(echo "$per_page" | jq -c --arg u "$url" --argjson s "$score_json" '. + [{url:$u, scores:$s}]')
  done

  jq -nc --argjson pages "$per_page" --arg company "$company" --arg domain "$domain" '
    {
      company: $company, domain: $domain,
      pages: $pages,
      overall: (
        ($pages | map(.scores.overall // 0) | add // 0) as $sum
        | if ($pages | length) > 0 then ($sum / ($pages | length)) else 0 end
      )
    }
  ' > "$out_dir/audit.json"

  echo "$out_dir/audit.json"
}

cmd_recommend() {
  [ ! -f "$CONFIG_PATH" ] && { echo '{"error":"not_initialized"}' >&2; exit 2; }
  local latest_dir analyze_path
  latest_dir=$(find /workspace/home/projects -maxdepth 1 -type d -name 'aeo-*' 2>/dev/null | sort | tail -1)
  analyze_path="$latest_dir/analyze.json"
  [ ! -f "$analyze_path" ] && { echo '{"error":"no_analysis","message":"run analyze first"}' >&2; exit 2; }

  local analyze_blob company prompt resp completion recs_json
  analyze_blob=$(jq -c '.' "$analyze_path")
  company=$(jq -r '.company' "$CONFIG_PATH")

  prompt="You are an AEO consultant. The brand is \"$company\". Below is the JSON analysis of how often \"$company\" was mentioned across LLM responses to 50 prospect queries vs its competitors. Produce 3–5 prioritized, concrete recommendations to improve the brand's mention rate, share of voice, and competitor positioning. Return ONLY a JSON array of objects with fields: title (string, max 80 chars), priority (\"high\"|\"medium\"|\"low\"), rationale (string, max 250 chars), action (string, max 250 chars). Analysis:\n$analyze_blob"

  resp=$(llm_ask "claude" "$prompt" "Respond with ONLY a JSON array." "")
  completion=$(extract_completion "claude" "$resp")
  recs_json=$(echo "$completion" | sed -E 's/^```(json)?//; s/```$//' | jq -c '
    if type == "array" then . else [] end
  ' 2>/dev/null || echo '[]')

  jq -nc --argjson recs "$recs_json" --arg date "$(date -u +%FT%TZ)" \
    '{generated_at:$date, recommendations:$recs}' \
    > "$latest_dir/recommendations.json"

  echo "$latest_dir/recommendations.json"
}

SUB="${1:-}"; shift || true
case "$SUB" in
  status)    cmd_status "$@" ;;
  init)      cmd_init "$@" ;;
  queries)   cmd_queries "$@" ;;
  run)       cmd_run "$@" ;;
  analyze)   cmd_analyze "$@" ;;
  audit)     cmd_audit "$@" ;;
  recommend) cmd_recommend "$@" ;;
  ""|-h|--help)
    cat <<'USAGE' >&2
Usage: aeo.sh <subcommand> [args]
Subcommands:
  status                                Print current config + run count
  init --domain X --name Y [--providers chat_gpt,...] [--competitors a.com,b.com]
  queries --limit N [--dry-run]         Generate N prospect queries
  run                                   Run all queries × providers, save responses
  analyze                               Compute mention metrics from latest run
  audit                                 Score the site for AI-readability
  recommend                             Generate prioritized actions from analyze.json
USAGE
    exit 2 ;;
  *) echo "{\"error\":\"unknown_subcommand\",\"sub\":\"$SUB\"}" >&2; exit 2 ;;
esac
```
