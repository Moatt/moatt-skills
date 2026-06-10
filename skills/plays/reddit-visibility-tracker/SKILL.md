---
name: reddit-visibility-tracker
description: >
  Measure and report the payoff of a Reddit motion: where your threads rank on
  Google, when AI assistants cite them, plus engagement and mention sentiment —
  pulled together into a client dashboard and export. Chains reddit-serp-tracker,
  aeo, reddit-aeo-monitor, and create-dashboard.
tags: [seo]
---

# Reddit Visibility Tracker

Reddit threads are search pages: they rank on Google and get cited by AI answer
engines. This play tracks both over time and rolls everything into a client view.
Stage 6–7 of the `reddit-growth-engine` moat.

## When to Use

- "Are our Reddit threads ranking / getting cited by AI?"
- "Build the Reddit results dashboard / client report."
- "Track our Reddit SEO + AEO."

## Inputs

- **Tracked Reddit thread URLs** — yours (and competitor threads for share of voice).
- **Target queries** — the searches that matter ("best EOR for contractors", "X vs Y").
- **Brand + competitors** — for AEO share-of-voice.
- **Cadence** — periodic re-checks (weekly/monthly); SERP + LLM positions drift.

## Budget your tool calls

A naive run of this play (every sub-skill, every query, one exec per request)
exhausts the chat step budget before the dashboard exists. Batch aggressively:

- Steps 1–4 collapse into ONE shell script: loop all queries × surfaces ×
  providers, save raw JSON to `/workspace/home/projects/reddit/visibility/`
  (dated filenames), print one compact summary line per call. One exec call,
  high timeout.
- If the user allows **sample/placeholder data** (or a section has no data
  yet), do NOT run that section's collectors at all — seed the dashboard's
  data file directly with clearly-labeled sample rows and move on.
- Spend your remaining calls on Step 5 (the dashboard build + export) — that
  is the deliverable; data collection must never starve it.

## Workflow

### Step 1 — Google + AI citation per thread

Run **`reddit-serp-tracker`**: for each target query it records the Google organic
position of your Reddit threads (DataForSEO SERP, depth kept low), Google AI Mode
presence, and whether ChatGPT/Claude/Gemini/Perplexity cite a Reddit URL (the
`sources`/`annotations` array of the LLM response). Date every row.

### Step 2 — Brand AEO context

Run **`aeo`** for the broader brand picture across the four assistants (mention
rate, competitor share of voice). This frames whether Reddit is moving the needle
on overall AI visibility.

### Step 3 — Thread-level intervention read (optional)

Run **`reddit-aeo-monitor`** to score which threads are high AI-leverage and what
intervention (engage / canonical content / correct / monitor) each warrants.
`reddit-serp-tracker` is the raw measurement; `reddit-aeo-monitor` is the
what-to-do-about-it layer — use them together, don't duplicate.

### Step 4 — Engagement + mentions

Pull current engagement on your posts/threads (upvotes, comments) via
`reddit-post-finder`, and mention counts + tone (positive/neutral/negative) for
the brand across the monitored subs.

### Step 5 — Dashboard + export

Compose the client deliverable from the dated series — two artifacts, always both:

1. **The dashboard**: an in-app report/dashboard artifact with these panels —
   30-day KPI row, Google positions per thread (+ avg position), AI citations
   by engine (share vs competitors), engagement on posted content, mention
   count + sentiment split. Build it with the platform's report tooling
   (report/dashboard artifact), NOT a bespoke web app.
2. **The export**: write the underlying tables to dated files the client can
   take away — one CSV per panel (or a single JSON) under
   `/workspace/home/projects/reddit/visibility/exports/<YYYY-MM-DD>/` — and tell
   the user the paths.

Label any sample/placeholder rows clearly in both. (The legacy
`create-dashboard` box app — `/home/user/dashboard`, port 3847 — is NOT
available on the current Box platform; don't go looking for it.)

## What to actually report (open question from the brief)

Which numbers matter to the client is an open question — ask. Sensible defaults:
threads ranking on Google + average position, AI citations by engine (and share
vs. competitors), engagement on posted content, and mention sentiment trend.
Don't drown the report; lead with the 3–4 the client will act on.

## Tools Required

- `reddit-serp-tracker` (Google + AI citation, dated)
- `aeo` (brand AEO share of voice)
- `reddit-aeo-monitor` (intervention recommendations) — optional
- `reddit-post-finder` (engagement + mentions)
- platform report/dashboard tooling for the compose step (see Step 5; the
  legacy `create-dashboard` box app is unavailable on the current platform)

## Output

- A dated data store (positions, citations, engagement, mentions, sentiment).
- A client dashboard + export.

## Trigger Phrases

- "Track our Reddit visibility on Google and AI"
- "Build the Reddit client dashboard"
- "Are our Reddit threads getting cited?"
