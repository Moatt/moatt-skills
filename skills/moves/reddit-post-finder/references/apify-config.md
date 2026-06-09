# Apify Reddit Actor Configuration

This skill drives **two live reddit.com actors** through the Karmable/Moatt proxy:

| Purpose | Actor | Why |
|---------|-------|-----|
| Posts (with metrics) | `parseforge/reddit-posts-scraper` | rich fields: `score`, `numComments`, `upvoteRatio` |
| Comments | `trudax/reddit-scraper-lite` | global comment search; **no engagement metrics** |

Auth: all calls go through `$MOATT_API_BASE/v1/proxy/apify/...` with `Authorization: Bearer $MOATT_API_KEY`. The proxy injects the real Apify token server-side and bills usage to your org. Do **not** set `APIFY_API_TOKEN` in the skill — the proxy owns it.

---

## Posts — parseforge/reddit-posts-scraper

`proxyConfiguration` is **required**. Pick a mode by which input field you set:

```json
// Global keyword search (what --query sends)
{
  "searchQueries": ["Deel"],
  "sort": "top",
  "time": "month",
  "maxItems": 200,
  "postsPerSource": 200,
  "maxPages": 10,
  "proxyConfiguration": { "useApifyProxy": true }
}

// Subreddit browse (what --subreddit sends)
{
  "subreddits": ["growthhacking", "SaaS"],
  "sort": "top",
  "time": "week",
  "maxItems": 50,
  "postsPerSource": 50,
  "proxyConfiguration": { "useApifyProxy": true }
}
```

- `searchInSubreddit: "<sub>"` restricts a `searchQueries` run to one subreddit.
- `sort` ∈ `hot|new|top|rising|controversial|relevance`. `time` ∈ `hour|day|week|month|year|all`.

**Output fields** (the script maps these → the stable schema): `id`, `title`, `author`, `subreddit`, `score`, `numComments`, `upvoteRatio`, `selfText`, `permalink`, `url`, `createdUtc`, `createdAt`, `postAgeHours`. The script builds the post URL from `permalink` (the `url` field is the external link for link-posts).

---

## Comments — trudax/reddit-scraper-lite

Output is **heterogeneous** — every item has a `dataType` (`post` / `comment` / `community` / `user`); the script keeps only `comment`. trudax-lite returns **no `score` / comment-count** (mapped to `null`).

```json
// Global comment search (what --content comments + --query sends)
{
  "searches": ["Deel"],
  "searchPosts": false,
  "searchComments": true,
  "searchCommunities": false,
  "searchUsers": false,
  "sort": "new",
  "maxItems": 50,
  "maxComments": 50
}

// Subreddit comment browse (no keyword): startUrls to the subreddit listing
{
  "startUrls": [{ "url": "https://www.reddit.com/r/SaaS/top/?t=week" }],
  "searchPosts": false,
  "searchComments": true,
  "maxItems": 50,
  "maxComments": 50
}
```

- `searchCommunityName: "<sub>"` restricts a `searches` run to one subreddit.
- `sort` ∈ `relevance|hot|top|new|rising|comments` (no `controversial`).

**Comment output fields**: `dataType`, `id`, `parsedId`, `url`, `username`, `communityName` (`r/`-prefixed), `parsedCommunityName` (bare), `body`, `html`, `createdAt`, `scrapedAt`. The script uses `parsedCommunityName` for grouping and `username` → `author`.

---

## Direct API usage (curl, via the proxy)

```bash
# Start a run
curl -s -X POST "$MOATT_API_BASE/v1/proxy/apify/acts/parseforge~reddit-posts-scraper/runs" \
  -H "Authorization: Bearer $MOATT_API_KEY" -H "Content-Type: application/json" \
  -d '{"searchQueries":["Deel"],"sort":"top","time":"month","maxItems":50,"proxyConfiguration":{"useApifyProxy":true}}'

# Poll status (RUN_ID from the start response .data.id)
curl -s -H "Authorization: Bearer $MOATT_API_KEY" \
  "$MOATT_API_BASE/v1/proxy/apify/actor-runs/RUN_ID"

# Fetch results (DATASET_ID from .data.defaultDatasetId)
curl -s -H "Authorization: Bearer $MOATT_API_KEY" \
  "$MOATT_API_BASE/v1/proxy/apify/datasets/DATASET_ID/items?format=json"
```

---

## Cost & freshness

- Both actors are **live reddit.com** (data is current at run time), ~$3.00–3.40 / 1,000 results, pay-per-result.
- **Comments inflate volume** — keep `maxComments`/`--max-comments` modest (default 50).
- `--content both` = two actor runs (posts + comments), so it costs more than either alone.
- History: the prior actor `openclawai/reddit-scraper` was PullPush-backed and froze at **2025-05-19** — it silently served ~13-month-old data. Do not reintroduce it for live use.
