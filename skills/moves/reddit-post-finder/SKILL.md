---
name: reddit-post-finder
description: Search live Reddit posts via KonbiniAPI. Use to find Reddit threads, track competitor/brand mentions, monitor product feedback, surface pain points, or analyze subreddit activity. GLOBAL keyword search across all of Reddit (use --query; best for "which subreddits mention X most" — one search returns posts from many subreddits to group and count) or subreddit browsing (use --subreddit when you know the communities). Posts come with upvotes and comment counts. Supports keyword filtering, time windows, and per-subreddit mention counts.
---

# Reddit Post Finder

## Setup

Read your credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json doesn't exist, tell the user to run: `npx moatt login`

All endpoints use Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`. KonbiniAPI usage is billed to your org through the Karmable/Moatt proxy. Do **not** set `KONBINI_API_KEY` in the skill — the proxy injects it server-side.

## Live data via KonbiniAPI

This skill searches **live reddit.com** through KonbiniAPI — every request fetches current data (nothing cached, nothing stale) and returns rich post metrics (`upVotes`, `numberOfComments`). It replaced the old Apify actors, which were slow (30–120s of actor-run polling per call) and expensive.

**Posts only.** KonbiniAPI has no reliable global comment search, so this skill does not fetch comments; for brand/competitor monitoring, search post titles and bodies.

## Choosing a mode

- **"Which subreddits talk about X?" / "Where is X discussed?" / brand or competitor mentions** → use **`--query`** (global search across all of Reddit). One call returns posts from many subreddits, each tagged with its subreddit, so you can group and count. Do **not** guess a list of subreddits and browse each — slow and misses communities you didn't think of.
- **"What's happening in r/foo?" / you already know the communities** → use **`--subreddit`**.
- **Posts in a specific subreddit mentioning a term** → combine `--query X --subreddit foo`. This browses r/foo and keeps posts whose title/body match the query terms (raise `--max-posts` for a niche subreddit so enough recent posts are scanned).

## Ranking subreddits — use the built-in flag, don't re-implement it

To answer "which subreddits mention X most," pass **`--output subreddit-counts`**. It groups every result by subreddit and prints a ranked count table. The first line on stdout is `#  Mentions  Subreddit`.

**Do NOT** run `--output json` and pipe it into your own `Counter`/`group by` — that re-does work the flag already does. (`--output json` is only for when you need the full post *content*, not counts.) Progress lines like `[posts] fetched 247` go to **stderr**; the ranked table is on **stdout** — read stdout for the answer.

## Performance

KonbiniAPI is fast — each request is a live fetch (~1–3s), not an actor poll. Larger `--max-posts` simply fetches more pages (100 posts per page). Transient upstream `502`s are retried automatically (Konbini refunds failed requests, so retries are free).

- **Common-word brands need disambiguation.** A bare `--query Deel` is noisy ("deel" is Dutch for "part"). Use specific phrases (`"Deel payroll"`, `"Deel EOR"`, `"Deel contractor"`), one call each, then merge the count tables.

## Quick Start

```bash
# Which subreddits mention "Deel payroll" most (ranked counts — flag does the counting)
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --query "Deel payroll" --max-posts 150 --time year --output subreddit-counts

# Posts mentioning a term, full content
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --query "Deel payroll" --max-posts 150 --output json

# Top posts from r/growthhacking this week
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --subreddit growthhacking --sort top --time week

# Posts in r/LLMDevs mentioning a term
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --query Langfuse --subreddit LLMDevs --max-posts 100
```

## How the Script Works

1. Picks the mode: `--query` alone → global keyword search (`/v1/reddit/search/posts`); `--subreddit` → browse each subreddit's listing (`/v1/reddit/subreddits/<sub>/posts`); `--query` + `--subreddit` → browse the subreddit(s) and filter by the query terms client-side.
2. Calls KonbiniAPI via the Karmable proxy, paginating with the returned cursor up to `--max-posts` (100 posts/page).
3. Maps each post to the stable `communityName`/`upVotes`/`numberOfComments`/… schema.
4. Applies client-side keyword / `--days` filtering.
5. Sorts by upvotes (descending) and emits JSON, a summary, or per-subreddit counts.

> **Why browse-then-filter for scoped search:** KonbiniAPI's per-subreddit *search* endpoint does not reliably scope to the named subreddit (it leaks global results), so the skill never uses it. Browsing the subreddit and filtering by keyword keeps every result genuinely inside the target community.

## CLI Reference

| Flag | Default | Description |
|------|---------|-------------|
| `--query` | none | **Global** keyword search across all of Reddit. Makes `--subreddit` optional. Best for "which subreddits mention X most". With `--subreddit`, filters that subreddit's posts. |
| `--subreddit` | *required unless `--query`* | Subreddit name(s), comma-separated. With `--query`, browses these subreddits and keeps posts matching the query. |
| `--keywords` | none | Client-side filter on returned posts (comma-separated, OR logic). |
| `--days` | none | Client-side: drop posts older than N days. (Use `--time` for the search window.) |
| `--max-posts` | 50 | Max posts to fetch (paginated, 100/page). |
| `--sort` | top | `hot`, `new`, `top`, `rising`, `relevance`. Clamped per endpoint: `rising` applies to subreddit browse, `relevance` to global search; unsupported values map to `hot`. |
| `--time` | week | Time window: `hour`, `day`, `week`, `month`, `year`, `all`. Applies to `top`/`controversial`/`comments` sorts. |
| `--output` | json | `json`, `summary`, or `subreddit-counts`. |
| `--timeout` | 60 | Max seconds per HTTP request. |

> `--keywords` filters *within posts already fetched*. To find posts mentioning X anywhere, use `--query X` (searches all of Reddit); `--keywords` only narrows what a pull already returned.

## Cost note

KonbiniAPI bills **one credit per request** (~$0.002/credit), and one request returns up to 100 posts. So `--max-posts 150` is ~2 credits (~$0.004) — far cheaper than the old per-result Apify actors.

## Tips for Small Subreddits

Tiny subreddits often return little with `--sort hot` (the hot feed is barely populated). Use `--sort top --time week` (or `month`) instead.

## Common Workflows

### 0. Which subreddits mention X most (global search → ranked counts)

```bash
# Post mentions, ranked by subreddit (the flag does the counting)
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --query "Deel payroll" --max-posts 150 --time year --output subreddit-counts

# Need the actual posts behind the counts? Re-run with --output json
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --query "Deel payroll" --max-posts 150 --output json
```

Use `--query` (global search), **not** a guessed `--subreddit` list. Read the ranked table off stdout — don't pipe `--output json` into your own counter. For a common-word brand, run a few specific phrases (`"Deel payroll"`, `"Deel EOR"`, `"Deel contractor"`) as separate calls and merge the tables.

### 1. Competitor / Brand Mentions

```bash
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --query "Langfuse" --max-posts 150 --time month --output json
```

### 2. Subreddit Pain-Point Discovery

```bash
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --subreddit LLMDevs --max-posts 100 \
  --keywords "frustrating,difficult,hard to,wish there was,better way"
```

## Discovery & vetting (part of the Reddit Growth Engine)

This skill is the **data pull** behind subreddit discovery. To go from raw mention
counts to a decision about which subs to be active in:

- **Find candidates:** `--query` global search + `--output subreddit-counts` (this
  skill). For a common-word brand, run specific phrases as separate calls and merge.
- **Confirm a sub is real:** browse its `new` feed (`--subreddit <sub> --sort new
  --output json`) and read the posts — a sub can match the ICP but be hiring-only
  or off-topic. (Use post velocity from the `new` feed as the activity proxy, plus
  the Konbini **subreddit-info** endpoint `GET /v1/reddit/subreddits/<sub>` for
  `memberCount` / `published` age / rules — see `references/konbini-config.md`.)
- **Judge usability + cluster topics:** the `reddit-subreddit-vetter` move does
  exactly this on top of the pulls above; the `reddit-subreddit-discovery` play
  wires the whole Product → ICP → subreddits chain together.

## Important: Always Include URLs

When presenting Reddit results, **always include the original URL** for every post so the user can read the full discussion. Never deliver a summary table without links.

## Output Format

`--output` controls rendering; `--query`/`--subreddit` always fetch full posts:

- `--output json` (default) → full posts (every field below), JSON array sorted by upvotes.
- `--output summary` → table: upvotes / comments / subreddit / title-or-snippet.
- `--output subreddit-counts` → aggregate only: each subreddit and its post-mention count, ranked. To get the underlying posts, re-run with `--output json`.

Item shape (json / summary):

```json
{
  "dataType": "post",
  "title": "Post title",
  "body": "Post body...",
  "communityName": "growthhacking",
  "upVotes": 42,
  "numberOfComments": 15,
  "upvoteRatio": null,
  "createdAt": "2026-06-09T12:00:00.000Z",
  "url": "https://www.reddit.com/r/...",
  "author": "username",
  "post_id": "abc123"
}
```

`upvoteRatio` is always `null` — KonbiniAPI does not expose it (the field is kept for schema stability with downstream skills).

## Configuration

See `references/konbini-config.md` for endpoint shapes, field mappings, and token setup.
