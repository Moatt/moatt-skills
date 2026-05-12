---
name: youtube-watcher
description: Retrieve transcripts from YouTube videos. Use when you need to summarize a video, answer questions about what was said, or pull specific information out of one.
author: michael gathara
version: 1.0.0
triggers:
  - "watch youtube"
  - "summarize video"
  - "video transcript"
  - "youtube summary"
  - "analyze video"
metadata: {"clawdbot":{"emoji":"📺","requires":{"bins":["yt-dlp"]},"install":[{"id":"brew","kind":"brew","formula":"yt-dlp","bins":["yt-dlp"],"label":"Install yt-dlp (brew)"},{"id":"pip","kind":"pip","package":"yt-dlp","bins":["yt-dlp"],"label":"Install yt-dlp (pip)"}]}}
---

# YouTube Watcher

Pulls transcripts from YouTube videos so they can be summarized, queried, or mined for specific content.

## Usage

### Get Transcript

Fetch a video's text transcript.

```bash
python3 {baseDir}/scripts/get_transcript.py "https://www.youtube.com/watch?v=VIDEO_ID"
```

## Examples

**Summarize a video:**

1. Pull the transcript:
   ```bash
   python3 {baseDir}/scripts/get_transcript.py "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
   ```
2. Read the output and produce the summary for the user.

**Find specific information:**

1. Pull the transcript.
2. Search the text for keywords or answer the user's question from the content.

## Notes

- `yt-dlp` must be installed and on the PATH.
- Works on videos that have closed captions (CC) or auto-generated subtitles.
- The script errors out if the video has no subtitles at all.
