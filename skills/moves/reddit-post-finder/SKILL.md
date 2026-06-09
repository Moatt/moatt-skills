---
name: reddit-post-finder
description: Search and scrape live Reddit posts AND comments via Apify. Use to find Reddit threads, track competitor/brand mentions, monitor product feedback, surface pain points, or analyze subreddit activity. GLOBAL keyword search across all of Reddit (use --query; best for "which subreddits mention X most" — one search returns items from many subreddits to group and count) or subreddit scraping (use --subreddit when you know the communities). Fetch posts (with upvotes/comment-counts), comments (global comment search), or both via --content. Supports keyword filtering, time windows, and per-subreddit mention counts.
---

# Reddit Post Finder

## Setup

Read your credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json doesn't exist, tell the user to run: `npx moatt login`

All endpoints use Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`. Apify usage is billed to your org through the Karmable proxy.

## Two actors, live data

This skill uses **two live reddit.com actors** (one search returns current data, not a stale dump):

- **Posts** → `parseforge/reddit-posts-scraper` — rich metrics (`upVotes`, `numberOfComments`, upvote ratio).
- **Comments** → `trudax/reddit-scraper-lite` — global comment search. **No engagement metrics** — comment `upVotes`/`numberOfComments` are `null`.

`--content` chooses which: `posts` (default), `comments`, or `both`.

> Why two actors: no single live actor gives both rich post metrics AND global comment search. (The previous single actor, `openclawai/reddit-scraper`, was PullPush-backed and froze at 2025-05-19 — it silently served ~13-month-old data. These actors are live.)

## Choosing a mode

- **"Which subreddits talk about X?" / "Where is X discussed?" / brand or competitor mentions** → use **`--query`** (global search across all of Reddit). One call returns items from many subreddits, each tagged with its subreddit, so you can group and count. Do **not** guess a list of subreddits and scrape each — slow, costly, and misses communities you didn't think of.
- **"What's happening in r/foo?" / you already know the communities** → use **`--subreddit`**.
- **Mentions often live in comments**, not post titles — add `--content both` (or `comments`) for brand monitoring.
- **For *recent* comments use `--sort new`.** `--sort top` (the default) surfaces all-time popular comments, which can be months/years old; posts honor `--time`, but comment search does not.

## Ranking subreddits — use the built-in flag, don't re-implement it

To answer "which subreddits mention X most," pass **`--output subreddit-counts`**. It already groups every result by subreddit and prints a ranked count table. The first line on stdout is `#  Mentions  Subreddit`.

**Do NOT** run `--output json` and pipe it into your own `Counter`/`group by` — that re-does work the flag already does. (`--output json` is only for when you need the full post/comment *content*, not counts.) Progress lines like `[posts] fetched 247` go to **stderr**; the ranked table is on **stdout** — read stdout for the answer.

## Performance & avoiding timeouts

Every call drives a **live actor that polls 30–120s** (longer with bigger `--max-posts` or `--time year`). To avoid box/exec timeouts and pointless retries:

- **Set the `boxExec` `timeoutMs` high — use `300000` (the 5-min max).** The default is only 60s, and these calls legitimately take 30–120s+. Do **not** lower it (a frequent mistake: dropping it to 90s, which then times out). The Box can run long; the timeout is just how long the tool waits.
- **Keep `--max-posts ≤ 150`** (and `--max-comments ≤ 50`). `--max-posts 300 --time year` routinely runs >2 min.
- **Split content types into separate calls.** `--content both` runs two actors back-to-back and frequently times out at high caps — prefer one `--content posts` call and, if needed, one `--content comments` call.
- **Never parallelize** multiple invocations in one shell (`cmd & cmd & wait`). That multiplies wall-time and hits the timeout; run them sequentially instead.
- **Common-word brands need disambiguation.** A bare `--query Deel` is noisy ("deel" is Dutch for "part"). Use specific phrases (`"Deel payroll"`, `"Deel EOR"`, `"Deel contractor"`), one call each, then merge the count tables.

## Quick Start

```bash
# Which subreddits mention "Deel payroll" most (ranked counts — flag does the counting)
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --query "Deel payroll" --max-posts 150 --time year --output subreddit-counts

# Posts mentioning a term, full content
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --query "Deel payroll" --content posts --max-posts 150 --output json

# Top posts from r/growthhacking this week
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --subreddit growthhacking --sort top --time week

# Restrict a global search to one subreddit, posts + comments
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --query Langfuse --subreddit LLMDevs --content both
```

## How the Script Works

1. Picks the actor(s) from `--content`: posts → parseforge, comments → trudax, both → both (merged).
2. Picks the mode: `--query` → global keyword search; `--subreddit` → browse named subreddits (single `--subreddit` is pushed down to the actor; with `--query` it restricts results).
3. Calls each actor via the Karmable proxy, polls to completion, fetches the dataset, and maps each item to the stable `communityName`/`upVotes`/`numberOfComments`/… schema (tagging `dataType` = `post` or `comment`).
4. Applies client-side keyword / `--days` / multi-subreddit filtering.
5. Sorts by upvotes (descending; comments sink below scored posts) and emits JSON, a summary, or per-subreddit counts.

## CLI Reference

| Flag | Default | Description |
|------|---------|-------------|
| `--query` | none | **Global** search keyword(s) across all of Reddit. Makes `--subreddit` optional. Best for "which subreddits mention X most". |
| `--subreddit` | *required unless `--query`* | Subreddit name(s), comma-separated. With `--query`, restricts results to these subreddits. |
| `--content` | posts | `posts` (parseforge, has upvotes/comment-counts), `comments` (trudax, **no metrics**), or `both`. |
| `--keywords` | none | Client-side filter on returned items (comma-separated, OR logic). |
| `--days` | none | Client-side: drop items older than N days. (Use `--time` for the actor's window.) |
| `--max-posts` | 50 | Max posts to fetch. |
| `--max-comments` | 50 | Max comments to fetch. |
| `--sort` | top | `hot`, `new`, `top`, `rising`, `relevance` (accepted by both actors). |
| `--time` | week | Post time window: `hour`, `day`, `week`, `month`, `year`, `all`. |
| `--output` | json | `json`, `summary`, or `subreddit-counts`. |
| `--timeout` | 300 | Max seconds to wait per Apify run. |

> `--keywords` filters *within results already fetched*. To find items mentioning X anywhere, use `--query X` (searches all of Reddit); `--keywords` only narrows what a pull already returned.

## Cost note

These are live, paid actors (~$3/1k results). **Comments inflate volume** — keep `--max-comments` modest (default 50). `--content both` runs two actor calls (posts + comments), so it costs more than either alone.

## Tips for Small Subreddits

Tiny subreddits often return zero posts with `--sort hot` (the hot feed is barely populated). Use `--sort top --time week` (or `month`) instead.

## Common Workflows

### 0. Which subreddits mention X most (global search → ranked counts)

```bash
# Post mentions, ranked by subreddit (the flag does the counting)
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --query "Deel payroll" --content posts --max-posts 150 --time year --output subreddit-counts

# Comment mentions, as a SEPARATE call (don't combine into --content both at high caps)
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --query "Deel payroll" --content comments --max-comments 50 --sort new --output subreddit-counts

# Need the actual posts/comments behind the counts? Re-run with --output json
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --query "Deel payroll" --content posts --max-posts 150 --output json
```

Use `--query` (global search), **not** a guessed `--subreddit` list. Read the ranked table off stdout — don't pipe `--output json` into your own counter. For a common-word brand, run a few specific phrases (`"Deel payroll"`, `"Deel EOR"`, `"Deel contractor"`) as separate calls and merge the tables, rather than one heavy `--max-posts 300 --time year` call that times out.

### 1. Competitor / Brand Mentions (posts + comments, separate calls)

```bash
# Posts (with metrics)
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --query "Langfuse" --content posts --max-posts 150 --time month --output json

# Comments (recent), as its own call
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --query "Langfuse" --content comments --max-comments 50 --sort new --output json
```

### 2. Subreddit Pain-Point Discovery

```bash
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --subreddit LLMDevs --content both \
  --keywords "frustrating,difficult,hard to,wish there was,better way"
```

## Important: Always Include URLs

When presenting Reddit results, **always include the original URL** for every post/comment so the user can read the full discussion. Never deliver a summary table without links.

## Output Format

`--output` controls rendering; `--query`/`--subreddit` always fetch full items:

- `--output json` (default) → full items (every field below), JSON array sorted by upvotes.
- `--output summary` → table: type / upvotes / comments / subreddit / title-or-snippet. Comments show `-` for metrics.
- `--output subreddit-counts` → aggregate only: each subreddit and its mention count (posts and/or comments per `--content`), ranked. To get the underlying items, re-run with `--output json`.

Item shape (json / summary):

```json
{
  "dataType": "post",
  "title": "Post title",
  "body": "Post body...",
  "communityName": "growthhacking",
  "upVotes": 42,
  "numberOfComments": 15,
  "upvoteRatio": 0.95,
  "createdAt": "2026-06-09T12:00:00.000Z",
  "url": "https://www.reddit.com/r/...",
  "author": "username",
  "post_id": "abc123"
}
```

For `dataType: "comment"` items: `title` is empty, `body` holds the comment text, and `upVotes`/`numberOfComments`/`upvoteRatio` are `null` (trudax-lite returns no comment metrics).

## Configuration

See `references/apify-config.md` for actor input shapes, field mappings, and token setup.
