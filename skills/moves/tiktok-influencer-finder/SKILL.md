---
name: tiktok-influencer-finder
description: Locate TikTok influencers via Apify's Influencer Discovery Agent. Use when the user wants to discover TikTok creators or influencers in any niche.
argument-hint: [niche/description]
---

# TikTok Influencer Finder

## Setup

Pull credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json is missing, tell the user to run: `npx moatt login`

Every endpoint uses Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`

Hunt for TikTok influencers in a specific niche through Apify's Influencer Discovery Agent.

## Quick Start

You need `requests` plus either a `MOATT_API_KEY` or `APIFY_API_TOKEN` env var.

```bash
# Basic search
python3 skills/tiktok-influencer-finder/scripts/find_influencers.py \
  --description "fitness coaches for women over 40"

# With follower filters
python3 skills/tiktok-influencer-finder/scripts/find_influencers.py \
  --description "AI and tech reviewers" \
  --min-followers 10000 --max-followers 500000

# Summary table output
python3 skills/tiktok-influencer-finder/scripts/find_influencers.py \
  --description "vegan cooking creators" --output summary

# CSV export
python3 skills/tiktok-influencer-finder/scripts/find_influencers.py \
  --description "sustainable fashion" --output csv
```

## Step 1: Gather Criteria

Before running the search, gather the user's filter criteria. Collect ALL of the following:

1. **Niche/Description**: What kind of influencer? (use $ARGUMENTS if supplied, otherwise ask)
2. **Minimum follower count**: e.g. 5K, 10K, 50K
3. **Maximum follower count**: e.g. 50K, 100K, 500K
4. **Location filter**: e.g. US only, US + Canada, any English-speaking country
5. **Sub-niche preferences**: Any specific content focus within the broader niche

Pose all five criteria in a single question to minimise back-and-forth. Provide sensible defaults but always allow custom input.

## Step 2: Run the Search

Compose a thorough `--description` combining the user's niche, content-style preferences, and target audience. Be specific and descriptive.

```bash
python3 skills/tiktok-influencer-finder/scripts/find_influencers.py \
  --description "fitness coaches targeting women over 40, focus on home workouts and healthy aging" \
  --min-followers 5000 --max-followers 500000 \
  --min-fit 0.6 \
  --output json
```

The script uses `apify~influencer-discovery-agent`. It routes through the Moatt proxy when `MOATT_API_KEY` is set, or directly to Apify when `APIFY_API_TOKEN` is set.

## Step 3: Filter Results

After the results come back, apply the user's criteria:

- **Remove** profiles below the minimum follower count
- **Remove** profiles above the maximum follower count
- **Remove** profiles outside the requested location(s)
- **Remove** profiles that don't match the sub-niche (use the `fit` score and `fitDescription` to judge relevance; generally drop fit < 0.6)
- **Sort** the remaining results by fit score (descending), then follower count (descending)

## Step 4: Present Results

Surface the filtered results in a clean markdown table:

| Creator | Handle | Followers | Engagement | Location | Focus | Fit Score |

Include:
- Clickable TikTok profile links
- Follower count formatted readably (e.g. 46.3K)
- Engagement rate as a percentage
- Brief description of their content focus
- The AI-generated fit score

Below the table, include:
- **Total profiles analyzed** vs **profiles matching criteria**
- A note if very few results matched (suggest loosening criteria)
- An offer to run another search with different keywords or refined criteria

## CLI Reference

| Flag | Default | Description |
|------|---------|-------------|
| `--description` | *required* | Description of the influencer you want |
| `--keywords` | 5 | Number of search keywords to generate (max 5) |
| `--profiles-per-keyword` | 10 | Profiles per keyword (max 10) |
| `--min-followers` | none | Minimum follower count filter |
| `--max-followers` | none | Maximum follower count filter |
| `--min-fit` | 0.0 | Minimum fit score (0.0-1.0) |
| `--output` | json | Output format: `json`, `csv`, `summary` |
| `--token` | env var | Apify token (overrides env vars) |
| `--timeout` | 300 | Max seconds for the Apify run |

## Notes

- This skill targets TikTok specifically. If the user wants other platforms, let them know this is TikTok-only and recommend alternatives.
- Engagement rates above 100% can appear when viral posts drive disproportionate interaction relative to follower count.
- The influencer discovery agent may take 1-3 minutes depending on search breadth.
