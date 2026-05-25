#!/usr/bin/env bash
# seo-content-audit/scripts/run.sh
#
# Full SEO footprint audit for any domain via the Moatt DataForSEO proxy.
# Runs 7 phases (domain rank, ranked keywords, top pages, backlinks summary,
# competitor discovery, OnPage technical audit, keyword-gap vs top competitor),
# then synthesizes report.json.
#
# Usage:
#   bash /workspace/skills/seo-content-audit/scripts/run.sh <domain> [location_code] [language_code]
#
# Requires (already set by Box env via /tmp/moatt-env.sh):
#   $MOATT_API_KEY   — Bearer token for the Moatt proxy
#   $MOATT_API_BASE  — e.g. https://app.moatt.com

set -uo pipefail

DOMAIN="${1:-}"
LOCATION_CODE="${2:-2840}"
LANGUAGE_CODE="${3:-en}"
MAX_CRAWL_PAGES="${MAX_CRAWL_PAGES:-50}"
ONPAGE_POLL_INTERVAL="${ONPAGE_POLL_INTERVAL:-20}"   # seconds
ONPAGE_MAX_POLLS="${ONPAGE_MAX_POLLS:-12}"           # 12 * 20s = 4 min ceiling

if [ -z "$DOMAIN" ]; then
  echo '{"error":"missing_domain","message":"Usage: bash run.sh <domain> [location_code] [language_code]"}' >&2
  exit 2
fi
if [ -z "${MOATT_API_KEY:-}" ] || [ -z "${MOATT_API_BASE:-}" ]; then
  echo '{"error":"missing_credentials","message":"MOATT_API_KEY and MOATT_API_BASE must be set"}' >&2
  exit 3
fi

DOMAIN="$(echo "$DOMAIN" | sed -E 's#^https?://##; s#/.*$##; s#/$##')"
PROXY="${MOATT_API_BASE%/}/v1/proxy/dataforseo/rest"
DATE_STAMP="$(date +%F)"
OUT_DIR="/workspace/home/projects/seo-content-audit-${DATE_STAMP}/${DOMAIN}"
mkdir -p "$OUT_DIR"

dfs() {
  local endpoint="$1"
  local body="$2"
  curl -sS -X POST "$PROXY" \
    -H "Authorization: Bearer $MOATT_API_KEY" \
    -H "Content-Type: application/json" \
    --max-time 120 \
    -d "$(jq -nc --arg ep "$endpoint" --argjson b "$body" '{endpoint:$ep, body:$b}')"
}

# GET-equivalent — for DFS endpoints that carry the task_id in the path and
# don't accept a request body (e.g. on_page/summary/{id}, on_page/pages/{id}).
# The proxy honors `method:"GET"` and forwards as GET to api.dataforseo.com.
dfs_get() {
  local endpoint="$1"
  curl -sS -X POST "$PROXY" \
    -H "Authorization: Bearer $MOATT_API_KEY" \
    -H "Content-Type: application/json" \
    --max-time 60 \
    -d "$(jq -nc --arg ep "$endpoint" '{endpoint:$ep, method:"GET"}')"
}

log() { echo "[seo-content-audit] $*" >&2; }

log "domain=$DOMAIN location=$LOCATION_CODE language=$LANGUAGE_CODE"
log "proxy=$PROXY"
log "out=$OUT_DIR"

# ─── Phase 1 (async): kick off OnPage crawl ────────────────────────────────
# DFS on_page/task_post expects `domain` (NOT `target`) and `max_pages_to_crawl`
# (NOT `max_crawl_pages`). Field names verified against Context7 v3 docs 2026-05-23.
log "phase 1/7: on_page/task_post (crawl up to $MAX_CRAWL_PAGES pages)"
ONPAGE_POST_BODY=$(jq -nc --arg d "$DOMAIN" --argjson n "$MAX_CRAWL_PAGES" \
  '[{domain:$d, max_pages_to_crawl:$n, load_resources:true, enable_javascript:true, enable_browser_rendering:true}]')
ONPAGE_POST_JSON="$(dfs "/v3/on_page/task_post" "$ONPAGE_POST_BODY")"
echo "$ONPAGE_POST_JSON" > "$OUT_DIR/onpage_post.json"
ONPAGE_TASK_ID="$(echo "$ONPAGE_POST_JSON" | jq -r '.tasks[0].id // empty')"
if [ -z "$ONPAGE_TASK_ID" ]; then
  log "WARN: on_page task_post returned no task_id — technical audit will be skipped"
fi

# ─── Phase 2: domain rank overview ─────────────────────────────────────────
log "phase 2/7: domain_rank_overview"
RANK_BODY=$(jq -nc --arg t "$DOMAIN" --argjson loc "$LOCATION_CODE" --arg lang "$LANGUAGE_CODE" \
  '[{target:$t, location_code:$loc, language_code:$lang}]')
echo "$(dfs "/v3/dataforseo_labs/google/domain_rank_overview/live" "$RANK_BODY")" > "$OUT_DIR/domain_rank.json"

# ─── Phase 3: top ranked keywords (top 100) ───────────────────────────────
log "phase 3/7: ranked_keywords (top 100)"
RK_BODY=$(jq -nc --arg t "$DOMAIN" --argjson loc "$LOCATION_CODE" --arg lang "$LANGUAGE_CODE" \
  '[{target:$t, location_code:$loc, language_code:$lang, limit:100, order_by:["keyword_data.keyword_info.search_volume,desc"]}]')
echo "$(dfs "/v3/dataforseo_labs/google/ranked_keywords/live" "$RK_BODY")" > "$OUT_DIR/ranked_keywords.json"

# ─── Phase 4: top pages (top 50) ──────────────────────────────────────────
log "phase 4/7: relevant_pages (top 50)"
RP_BODY=$(jq -nc --arg t "$DOMAIN" --argjson loc "$LOCATION_CODE" --arg lang "$LANGUAGE_CODE" \
  '[{target:$t, location_code:$loc, language_code:$lang, limit:50}]')
echo "$(dfs "/v3/dataforseo_labs/google/relevant_pages/live" "$RP_BODY")" > "$OUT_DIR/top_pages.json"

# ─── Phase 5: backlinks summary ───────────────────────────────────────────
log "phase 5/7: backlinks summary"
BL_BODY=$(jq -nc --arg t "$DOMAIN" \
  '[{target:$t, internal_list_limit:10, backlinks_status_type:"live"}]')
echo "$(dfs "/v3/backlinks/summary/live" "$BL_BODY")" > "$OUT_DIR/backlinks_summary.json"

# ─── Phase 6: competitor discovery (top 5 keyword-overlap competitors) ─────
log "phase 6/7: competitors_domain"
COMP_BODY=$(jq -nc --arg t "$DOMAIN" --argjson loc "$LOCATION_CODE" --arg lang "$LANGUAGE_CODE" \
  '[{target:$t, location_code:$loc, language_code:$lang, limit:5}]')
COMPETITORS_JSON="$(dfs "/v3/dataforseo_labs/google/competitors_domain/live" "$COMP_BODY")"
echo "$COMPETITORS_JSON" > "$OUT_DIR/competitors.json"

TOP_COMPETITOR="$(echo "$COMPETITORS_JSON" | jq -r '.tasks[0].result[0].items[0].domain // empty')"

# ─── Phase 7: keyword-gap vs top competitor ───────────────────────────────
GAP_JSON='{"skipped":"no_top_competitor"}'
if [ -n "$TOP_COMPETITOR" ]; then
  log "phase 7/7: domain_intersection (vs $TOP_COMPETITOR)"
  GAP_BODY=$(jq -nc --arg t "$DOMAIN" --arg c "$TOP_COMPETITOR" --argjson loc "$LOCATION_CODE" --arg lang "$LANGUAGE_CODE" \
    '[{target1:$c, target2:$t, intersections:false, location_code:$loc, language_code:$lang, limit:100, filters:[["keyword_data.keyword_info.search_volume", ">", 50]]}]')
  GAP_JSON="$(dfs "/v3/dataforseo_labs/google/domain_intersection/live" "$GAP_BODY")"
else
  log "phase 7/7: skipped (no top competitor identified)"
fi
echo "$GAP_JSON" > "$OUT_DIR/keyword_gap.json"

# ─── Phase 1 (cont.): poll for OnPage results ─────────────────────────────
ONPAGE_SUMMARY_JSON='{"skipped":"no_task_id"}'
if [ -n "$ONPAGE_TASK_ID" ]; then
  log "phase 1 (cont.): polling on_page/summary task=$ONPAGE_TASK_ID (max ${ONPAGE_MAX_POLLS} polls @ ${ONPAGE_POLL_INTERVAL}s)"
  POLLS=0
  while [ $POLLS -lt $ONPAGE_MAX_POLLS ]; do
    sleep "$ONPAGE_POLL_INTERVAL"
    POLLS=$((POLLS + 1))
    SUMMARY="$(dfs_get "/v3/on_page/summary/$ONPAGE_TASK_ID")"
    STATUS="$(echo "$SUMMARY" | jq -r '.tasks[0].result[0].crawl_progress // empty')"
    log "  poll $POLLS/$ONPAGE_MAX_POLLS: crawl_progress=$STATUS"
    if [ "$STATUS" = "finished" ]; then
      ONPAGE_SUMMARY_JSON="$SUMMARY"
      break
    fi
  done
  if [ "$ONPAGE_SUMMARY_JSON" = '{"skipped":"no_task_id"}' ]; then
    ONPAGE_SUMMARY_JSON="$(jq -nc --arg id "$ONPAGE_TASK_ID" '{skipped:"crawl_did_not_finish_in_time", task_id:$id}')"
    log "WARN: OnPage crawl did not finish within poll budget"
  fi
fi
echo "$ONPAGE_SUMMARY_JSON" > "$OUT_DIR/onpage_summary.json"

# ─── Synthesize report.json ───────────────────────────────────────────────
log "synthesizing report.json"
jq -n \
  --arg domain "$DOMAIN" \
  --arg date "$DATE_STAMP" \
  --argjson loc "$LOCATION_CODE" \
  --arg lang "$LANGUAGE_CODE" \
  --arg top_competitor "${TOP_COMPETITOR:-}" \
  --arg onpage_task_id "${ONPAGE_TASK_ID:-}" \
  --slurpfile rank "$OUT_DIR/domain_rank.json" \
  --slurpfile ranked "$OUT_DIR/ranked_keywords.json" \
  --slurpfile pages "$OUT_DIR/top_pages.json" \
  --slurpfile backlinks "$OUT_DIR/backlinks_summary.json" \
  --slurpfile competitors "$OUT_DIR/competitors.json" \
  --slurpfile gap "$OUT_DIR/keyword_gap.json" \
  --slurpfile onpage "$OUT_DIR/onpage_summary.json" \
  '{
    domain: $domain,
    analysis_date: $date,
    location_code: $loc,
    language_code: $lang,
    data_source: "dataforseo_via_moatt_proxy",
    onpage_task_id: $onpage_task_id,
    top_competitor: $top_competitor,
    domain_rank_overview: $rank[0],
    ranked_keywords: $ranked[0],
    top_pages: $pages[0],
    backlinks_summary: $backlinks[0],
    competitors: $competitors[0],
    keyword_gap_vs_top_competitor: $gap[0],
    onpage_summary: $onpage[0]
  }' > "$OUT_DIR/report.json"

echo "$OUT_DIR/report.json"
exit 0
