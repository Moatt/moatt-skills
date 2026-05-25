#!/usr/bin/env bash
# seo-analyzer/scripts/run.sh
#
# Lightweight SEO snapshot for any domain via the Moatt DataForSEO proxy.
# Writes report.json to /workspace/home/projects/seo-analyzer-<YYYY-MM-DD>/
# and echoes the path on success.
#
# Usage:
#   bash /workspace/skills/seo-analyzer/scripts/run.sh <domain> [location_code] [language_code]
#   bash /workspace/skills/seo-analyzer/scripts/run.sh stripe.com
#   bash /workspace/skills/seo-analyzer/scripts/run.sh stripe.com 2826 en
#
# Requires (already set by Box env via /tmp/moatt-env.sh):
#   $MOATT_API_KEY   — Bearer token for the Moatt proxy
#   $MOATT_API_BASE  — e.g. https://app.moatt.com (NO trailing slash)

set -uo pipefail

DOMAIN="${1:-}"
LOCATION_CODE="${2:-2840}"   # US
LANGUAGE_CODE="${3:-en}"

if [ -z "$DOMAIN" ]; then
  echo '{"error":"missing_domain","message":"Usage: bash run.sh <domain> [location_code] [language_code]"}' >&2
  exit 2
fi

if [ -z "${MOATT_API_KEY:-}" ] || [ -z "${MOATT_API_BASE:-}" ]; then
  echo '{"error":"missing_credentials","message":"MOATT_API_KEY and MOATT_API_BASE must be set in the Box env"}' >&2
  exit 3
fi

# Strip any scheme / path / trailing slash from the domain
DOMAIN="$(echo "$DOMAIN" | sed -E 's#^https?://##; s#/.*$##; s#/$##')"

PROXY="${MOATT_API_BASE%/}/v1/proxy/dataforseo/rest"
DATE_STAMP="$(date +%F)"
OUT_DIR="/workspace/home/projects/seo-analyzer-${DATE_STAMP}/${DOMAIN}"
mkdir -p "$OUT_DIR"

# Single helper: POST to the proxy. $1 = DFS endpoint, $2 = JSON body string.
dfs() {
  local endpoint="$1"
  local body="$2"
  curl -sS -X POST "$PROXY" \
    -H "Authorization: Bearer $MOATT_API_KEY" \
    -H "Content-Type: application/json" \
    --max-time 90 \
    -d "$(jq -nc --arg ep "$endpoint" --argjson b "$body" '{endpoint:$ep, body:$b}')"
}

echo "[seo-analyzer] domain=$DOMAIN location=$LOCATION_CODE language=$LANGUAGE_CODE" >&2
echo "[seo-analyzer] proxy=$PROXY" >&2
echo "[seo-analyzer] out=$OUT_DIR" >&2

# ─── Phase 1: Domain authority + ranking snapshot ──────────────────────────
echo "[seo-analyzer] phase 1/4: domain_rank_overview" >&2
RANK_BODY=$(jq -nc --arg t "$DOMAIN" --argjson loc "$LOCATION_CODE" --arg lang "$LANGUAGE_CODE" \
  '[{target:$t, location_code:$loc, language_code:$lang}]')
DOMAIN_RANK_JSON="$(dfs "/v3/dataforseo_labs/google/domain_rank_overview/live" "$RANK_BODY")"
echo "$DOMAIN_RANK_JSON" > "$OUT_DIR/domain_rank.json"

# ─── Phase 2: Top ranked keywords (50) ─────────────────────────────────────
echo "[seo-analyzer] phase 2/4: ranked_keywords (top 50)" >&2
RK_BODY=$(jq -nc --arg t "$DOMAIN" --argjson loc "$LOCATION_CODE" --arg lang "$LANGUAGE_CODE" \
  '[{target:$t, location_code:$loc, language_code:$lang, limit:50, order_by:["keyword_data.keyword_info.search_volume,desc"]}]')
RANKED_JSON="$(dfs "/v3/dataforseo_labs/google/ranked_keywords/live" "$RK_BODY")"
echo "$RANKED_JSON" > "$OUT_DIR/ranked_keywords.json"

# Pull seed keywords (top 3 by volume) for phase 3 + 4
SEED_KEYWORDS_JSON="$(echo "$RANKED_JSON" | jq -c '[.tasks[0].result[0].items[] | .keyword_data.keyword] | map(select(. != null)) | .[0:3]' 2>/dev/null || echo '[]')"
if [ "$SEED_KEYWORDS_JSON" = "null" ] || [ -z "$SEED_KEYWORDS_JSON" ]; then
  SEED_KEYWORDS_JSON='[]'
fi

# ─── Phase 3: Content opportunities ────────────────────────────────────────
KEYWORD_IDEAS_JSON='{"skipped":"no_seed_keywords"}'
if [ "$SEED_KEYWORDS_JSON" != "[]" ]; then
  echo "[seo-analyzer] phase 3/4: keyword_ideas (seeds=$(echo "$SEED_KEYWORDS_JSON" | jq -r '. | join(", ")'))" >&2
  KI_BODY=$(jq -nc --argjson kw "$SEED_KEYWORDS_JSON" --argjson loc "$LOCATION_CODE" --arg lang "$LANGUAGE_CODE" \
    '[{keywords:$kw, location_code:$loc, language_code:$lang, limit:100, order_by:["keyword_info.search_volume,desc"], filters:[["keyword_info.search_volume", ">", 100], "and", ["keyword_info.competition_level", "in", ["LOW", "MEDIUM"]]]}]')
  KEYWORD_IDEAS_JSON="$(dfs "/v3/dataforseo_labs/google/keyword_ideas/live" "$KI_BODY")"
else
  echo "[seo-analyzer] phase 3/4: skipped (no ranked keywords)" >&2
fi
echo "$KEYWORD_IDEAS_JSON" > "$OUT_DIR/keyword_ideas.json"

# ─── Phase 4: Competitive SERP (top seed keyword) ──────────────────────────
SERP_JSON='{"skipped":"no_seed_keywords"}'
if [ "$SEED_KEYWORDS_JSON" != "[]" ]; then
  TOP_KW="$(echo "$SEED_KEYWORDS_JSON" | jq -r '.[0] // empty')"
  if [ -n "$TOP_KW" ]; then
    echo "[seo-analyzer] phase 4/4: serp_organic_live (kw=\"$TOP_KW\")" >&2
    SERP_BODY=$(jq -nc --arg kw "$TOP_KW" --argjson loc "$LOCATION_CODE" --arg lang "$LANGUAGE_CODE" \
      '[{keyword:$kw, location_code:$loc, language_code:$lang, depth:20}]')
    SERP_JSON="$(dfs "/v3/serp/google/organic/live/advanced" "$SERP_BODY")"
  fi
fi
echo "$SERP_JSON" > "$OUT_DIR/serp_top_keyword.json"

# ─── Synthesize report.json ───────────────────────────────────────────────
echo "[seo-analyzer] synthesizing report.json" >&2
jq -n \
  --arg domain "$DOMAIN" \
  --arg date "$DATE_STAMP" \
  --argjson loc "$LOCATION_CODE" \
  --arg lang "$LANGUAGE_CODE" \
  --slurpfile rank "$OUT_DIR/domain_rank.json" \
  --slurpfile ranked "$OUT_DIR/ranked_keywords.json" \
  --slurpfile ideas "$OUT_DIR/keyword_ideas.json" \
  --slurpfile serp "$OUT_DIR/serp_top_keyword.json" \
  '{
    domain: $domain,
    analysis_date: $date,
    location_code: $loc,
    language_code: $lang,
    data_source: "dataforseo_via_moatt_proxy",
    domain_rank_overview: $rank[0],
    ranked_keywords: $ranked[0],
    keyword_ideas: $ideas[0],
    competitive_serp: $serp[0]
  }' > "$OUT_DIR/report.json"

echo "$OUT_DIR/report.json"
exit 0
