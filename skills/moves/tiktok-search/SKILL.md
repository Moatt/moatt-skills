---
name: tiktok-search
description: Search TikTok - find profiles, videos, hashtags, and trending content
source: orthogonal
---


# TikTok Search

## Setup

Read your credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json does not exist, tell the user to run: `npx moatt login`

All endpoints use Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`


Search TikTok for profiles, videos, and hashtag content.

## When to Use

- User asks about a TikTok account
- User wants to find TikTok videos
- User asks about trending TikTok content
- Social media research

## How It Works

Uses the Scrape Creators API via Orthogonal to scrape TikTok data including profiles, hashtags, and trending content.

## Usage

### Get TikTok Profile

```bash
curl -s -X POST $MOATT_API_BASE/v1/proxy/orthogonal/run \
  -H "Authorization: Bearer $MOATT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"api":"scrapecreators","path":"/v1/tiktok/profile","query":{"handle":"charlidamelio"}}'
```

<details>
<summary>curl equivalent</summary>

```bash
curl -X POST "https://api.orth.sh/v1/run" \

  -H "Content-Type: application/json" \
  -d '{"api":"scrapecreators","path":"/v1/tiktok/profile","query":{"handle":"charlidamelio"}}'
```
</details>

### Search Hashtag Videos

```bash
curl -s -X POST $MOATT_API_BASE/v1/proxy/orthogonal/run \
  -H "Authorization: Bearer $MOATT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"api":"scrapecreators","path":"/v1/tiktok/search/hashtag","query":{"hashtag":"tech"}}'
```

### Get Trending Feed

```bash
curl -s -X POST $MOATT_API_BASE/v1/proxy/orthogonal/run \
  -H "Authorization: Bearer $MOATT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"api":"scrapecreators","path":"/v1/tiktok/get-trending-feed","query":{"region":"US"}}'
```

## Parameters

### Profile
- **handle** (required) - TikTok handle (without @)

### Hashtag Search
- **hashtag** (required) - Hashtag to search (without #)
- **region** (optional) - Region for the proxy
- **cursor** (optional) - Cursor for pagination
- **trim** (optional) - Set to "true" for a trimmed response

### Trending Feed
- **region** (required) - Region for the proxy (e.g., "US")
- **trim** (optional) - Set to true for a trimmed response

## Response

### Profile includes:
- Username and display name
- Bio/description
- Follower and following counts
- Total likes
- Verified status
- Profile image

### Videos include:
- Video title/description
- View count
- Like count
- Comment count
- Video URL

## Examples

**User:** "Look up charlidamelio on TikTok"
```bash
curl -s -X POST $MOATT_API_BASE/v1/proxy/orthogonal/run \
  -H "Authorization: Bearer $MOATT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"api":"scrapecreators","path":"/v1/tiktok/profile","query":{"handle":"charlidamelio"}}'
```

**User:** "What's trending on TikTok?"
```bash
curl -s -X POST $MOATT_API_BASE/v1/proxy/orthogonal/run \
  -H "Authorization: Bearer $MOATT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"api":"scrapecreators","path":"/v1/tiktok/get-trending-feed","query":{"region":"US"}}'
```

**User:** "What's trending with #tech on TikTok?"
```bash
curl -s -X POST $MOATT_API_BASE/v1/proxy/orthogonal/run \
  -H "Authorization: Bearer $MOATT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"api":"scrapecreators","path":"/v1/tiktok/search/hashtag","query":{"hashtag":"tech"}}'
```

## Error Handling

- **success: false** — the API may temporarily fail; retry after a few seconds
- Private accounts cannot be accessed
- Rate limiting may apply on rapid sequential requests


## Tips

- Remove @ from handles
- Remove # from hashtags
- Private accounts cannot be accessed
