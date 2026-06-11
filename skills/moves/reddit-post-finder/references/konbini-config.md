# KonbiniAPI Reddit Configuration

This skill drives **KonbiniAPI** (live reddit.com data) through the Karmable/Moatt proxy.

Auth: all calls go through `$MOATT_API_BASE/v1/proxy/konbini/...` with `Authorization: Bearer $MOATT_API_KEY`. The proxy injects the master Konbini key server-side and bills usage to your org. Do **not** set `KONBINI_API_KEY` in the skill — the proxy owns it.

Upstream base (behind the proxy): `https://api.konbiniapi.com`. Responses are [ActivityStreams 2.0](https://www.w3.org/ns/activitystreams).

---

## Endpoints used

| Mode | Endpoint (proxied) | Notes |
|------|--------------------|-------|
| Global keyword search | `GET /v1/reddit/search/posts?q=…` | All of Reddit. `order` ∈ `relevance\|hot\|top\|new\|comments`. |
| Subreddit browse | `GET /v1/reddit/subreddits/<sub>/posts` | Reliable scoping. `order` ∈ `hot\|new\|top\|rising\|controversial`. |

Common query params: `count` (max **100**/page), `cursor` (pagination — the response's `data.nextCursor`), `time` ∈ `hour|day|week|month|year|all` (applies to `top`/`controversial`/`comments` orders).

> ⛔ **Do NOT use** `GET /v1/reddit/subreddits/<sub>/search` — it does **not** reliably scope to the named subreddit (it returns global hits from other subreddits). For "posts in r/X mentioning Y", the skill browses `/subreddits/X/posts` and filters by the query terms client-side instead.

> ⛔ **No global comment search.** KonbiniAPI exposes comments only per-post (`/posts/<id>/comments`) or per-subreddit (`/subreddits/<sub>/comments`), not a global keyword comment search. This skill is **posts-only**.

---

## Response shape & field mapping

A list/search response is an `OrderedCollectionPage`:

```json
{
  "data": {
    "type": "OrderedCollectionPage",
    "totalItems": 1309,
    "nextCursor": "1772217402000",
    "orderedItems": [ { /* RedditPost */ } ]
  }
}
```

The script maps each `RedditPost` → the stable skill schema:

| Skill field | Konbini field | Notes |
|-------------|---------------|-------|
| `title` | `name` | Post title |
| `body` | `content` | Post body (nullable → `""`) |
| `communityName` | parsed from `url` | `…/r/<sub>/…` → `<sub>` (the `tag[]` array mixes subreddit + flair, so the permalink is the reliable source) |
| `upVotes` | `voteCount` | Net score |
| `numberOfComments` | `commentCount` | |
| `upvoteRatio` | — | Not exposed by Konbini → always `null` |
| `createdAt` | `published` | ISO 8601 |
| `url` | `url` (or `id`) | Permalink |
| `author` | `attributedTo.preferredUsername` | |
| `post_id` | `entityId` | e.g. `1tgywrw` |

---

## Pagination

`count` caps at 100 per request. To fetch more, pass `cursor=<data.nextCursor>` from the previous page; stop when `nextCursor` is `null` or no items return. The script does this automatically up to `--max-posts`.

---

## Cost & freshness

- **Live** reddit.com data — current at request time, nothing cached.
- Billing: **one credit per request** (~$0.002/credit), one request returns up to 100 posts. `--max-posts 150` ≈ 2 credits.
- Konbini echoes consumption in the `X-Credits-Used` response header; **failed requests (4xx/5xx) are auto-refunded**, so the proxy only charges on `2xx` and transient `502`s can be retried for free.

---

## Direct API usage (curl, via the proxy)

```bash
# Global keyword search
curl -s -H "Authorization: Bearer $MOATT_API_KEY" \
  "$MOATT_API_BASE/v1/proxy/konbini/v1/reddit/search/posts?q=Deel&order=top&time=year&count=50"

# Subreddit browse
curl -s -H "Authorization: Bearer $MOATT_API_KEY" \
  "$MOATT_API_BASE/v1/proxy/konbini/v1/reddit/subreddits/SaaS/posts?order=top&time=week&count=50"
```

History: the prior Apify actors (`parseforge/reddit-posts-scraper`, `trudax/reddit-scraper-lite`) were slow (30–120s actor-run polling) and billed per-result (~$3/1k). KonbiniAPI is a fast live fetch billed per-request. Do not reintroduce the actors for this skill.
