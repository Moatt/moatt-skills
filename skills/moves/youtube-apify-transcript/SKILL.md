---
name: youtube-apify-transcript
description: Fetch YouTube transcripts through the APIFY API. Works from cloud IPs (Hetzner, AWS, etc.) by routing around YouTube's bot detection. Free tier ships with $5/month of credits (~714 videos). No credit card required.
tags: [research]
---

# youtube-apify-transcript

## Setup

Pull credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json is missing, tell the user to run: `npx moatt login`

Every endpoint uses Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`

Retrieve YouTube transcripts through the APIFY API (works from cloud IPs and dodges YouTube bot detection).

## Why APIFY?

YouTube blocks transcript requests from cloud IPs (AWS, GCP, etc.). APIFY funnels the request through residential proxies, sidestepping bot detection reliably.

## Free Tier

- **$5/month of free credits** (~714 videos)
- No credit card required
- Plenty for personal use

## Cost

- **$0.007 per video** (well under a cent!)
- Track usage at: https://console.apify.com/billing

## Links

- [APIFY Pricing](https://apify.com/pricing)
- [Get API Key](https://console.apify.com/account/integrations)
- [YouTube Transcript Scraper Actor](https://apify.com/pintostudio/youtube-transcript-scraper)

## Setup

1. Open a free APIFY account: https://apify.com/
2. Grab your API token: https://console.apify.com/account/integrations
3. Set the environment variable:

```bash
# Append to ~/.bashrc or ~/.zshrc
export APIFY_API_TOKEN="apify_api_YOUR_TOKEN_HERE"

# Or use a .env file (never commit this!)
echo 'APIFY_API_TOKEN=apify_api_YOUR_TOKEN_HERE' >> .env
```

## Usage

### Basic Usage

```bash
# Get transcript as text (cache enabled by default)
python3 scripts/fetch_transcript.py "https://www.youtube.com/watch?v=VIDEO_ID"

# Short URL also works
python3 scripts/fetch_transcript.py "https://youtu.be/VIDEO_ID"
```

### Options

```bash
# Output to file
python3 scripts/fetch_transcript.py "URL" --output transcript.txt

# JSON format (includes timestamps)
python3 scripts/fetch_transcript.py "URL" --json

# Both: JSON to file
python3 scripts/fetch_transcript.py "URL" --json --output transcript.json

# Specify language preference
python3 scripts/fetch_transcript.py "URL" --lang de
```

### Caching (saves money!)

Transcripts cache to disk by default. Repeated requests for the same video cost $0.

```bash
# First request: fetched from APIFY ($0.007)
python3 scripts/fetch_transcript.py "URL"

# Second request: cache hit (FREE!)
python3 scripts/fetch_transcript.py "URL"
# Output: [cached] Transcript for: VIDEO_ID

# Bypass cache (force a fresh fetch)
python3 scripts/fetch_transcript.py "URL" --no-cache

# View cache stats
python3 scripts/fetch_transcript.py --cache-stats

# Clear every cached transcript
python3 scripts/fetch_transcript.py --clear-cache
```

Cache location: `.cache/` inside the skill directory (override via `YT_TRANSCRIPT_CACHE_DIR`)

### Batch Mode

Process several videos at once:

```bash
# Create a file with URLs (one per line)
cat > urls.txt << EOF
https://youtube.com/watch?v=VIDEO1
https://youtu.be/VIDEO2
https://youtube.com/watch?v=VIDEO3
EOF

# Process every URL
python3 scripts/fetch_transcript.py --batch urls.txt

# Batch run with JSON output to file
python3 scripts/fetch_transcript.py --batch urls.txt --json --output all_transcripts.json
```

## APIFY Actor Input

The script sends the following input to `pintostudio/youtube-transcript-scraper`:

```json
{
  "videoUrl": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Output fields:**

Every result holds a `data` array of transcript segments:

| Field   | Type   | Description                        |
|---------|--------|------------------------------------|
| `start` | number | Segment start time (seconds)       |
| `dur`   | number | Segment duration (seconds)         |
| `text`  | string | Transcript text for this segment   |

### Output Formats

**Text (default):**
```
Hello and welcome to this video.
Today we're going to talk about...
```

**JSON (--json):**
```json
{
  "video_id": "dQw4w9WgXcQ",
  "title": "Video Title",
  "transcript": [
    {"start": 0.0, "dur": 2.5, "text": "Hello and welcome"},
    {"start": 2.5, "dur": 3.0, "text": "to this video"}
  ],
  "full_text": "Hello and welcome to this video..."
}
```

## Error Handling

The script handles common errors:
- Invalid YouTube URL
- Video has no transcript
- API quota exceeded
- Network errors
