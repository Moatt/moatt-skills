---
name: github-activity-monitor
description: >
  Monitor GitHub for activity signals on a specified company or repository
  list — star velocity, contributor growth, release cadence, repo creation
  patterns, and dependency adoption. Surfaces strategic direction and
  team-scaling signals for devtools, OSS, and AI/ML companies. Uses
  GitHub's free public API; no PAT required for public-only monitoring,
  but a PAT raises rate limit dramatically.
tags: [research, competitive-intel]
---

# GitHub Activity Monitor

For devtools, OSS, and AI/ML companies, GitHub *is* the leading indicator. A repo's star-velocity, release cadence, contributor growth, and dependency footprint reveal product momentum 6-12 months before it shows up in revenue. This skill turns those signals into structured outbound triggers.

**Built for:** GTM teams selling into devtools companies, AI infrastructure firms, OSS-led businesses, or anyone whose buyer's day-job revolves around GitHub.

## When to Use

- "Monitor GitHub for {Company / repo / org}"
- "Find devtools companies with sudden star spikes"
- "Track {Repo} contributor growth"
- "Surface OSS adoption signals for {Vertical}"

## What GitHub Activity Reveals

| Signal | What it means |
|---|---|
| **Star velocity spike** (>2× baseline over 7 days) | Product hit a viral moment; demand window opens |
| **Sustained star growth** (>10% MoM over 6 months) | Building a real audience; OSS-led GTM working |
| **Contributor count growing** | Either hiring or community engagement |
| **External-PR ratio rising** | OSS strategy is winning; community is real |
| **Release cadence increase** | Active development; hiring + investment |
| **Release cadence drop** (>60 days no release) | Stalling; potential churn risk for adopters |
| **New repo created in target org** | Strategic direction; new product or library |
| **Public archive of a repo** | Project shut down — could signal pivot or layoff |
| **Company joining specific org / SIG** | Strategic alliance signal |
| **Major dependency adoption** | Tech stack signal — they now run on X |

## Inputs

Required:
- **Watchlist** — entries can be:
  - GitHub username/org (`acme`, `acmecorp`)
  - Specific repo (`acmecorp/data-platform`)
  - Set of repos (`acmecorp/*` covers all repos in the org)

Optional:
- **GitHub PAT** — without a PAT: 60 requests/hour (very limiting). With a PAT: 5,000/hour. Production use requires a PAT.
- **Cadence** — `hourly` / `daily` / `weekly`. Default: `daily`.
- **Star velocity threshold** — what counts as a spike. Default: 2× the rolling 30-day baseline.
- **Notification channels** — Slack webhook, CRM annotation, etc.
- **Cross-reference with watchlist** — if you maintain a target-account list, the skill can flag GitHub activity at companies you care about.

## API Endpoints (Public, Free)

| Need | Endpoint |
|---|---|
| Repo metadata | `GET /repos/{owner}/{repo}` |
| Stargazers (with timestamps) | `GET /repos/{owner}/{repo}/stargazers` (with `Accept: application/vnd.github.star+json`) |
| Contributors | `GET /repos/{owner}/{repo}/contributors` |
| Releases | `GET /repos/{owner}/{repo}/releases` |
| Commits | `GET /repos/{owner}/{repo}/commits` |
| Org repos | `GET /orgs/{org}/repos` |
| Search repos | `GET /search/repositories?q={query}` |
| Repo activity stats | `GET /repos/{owner}/{repo}/stats/participation` |
| Dependency graph | `GET /repos/{owner}/{repo}/dependency-graph/sbom` (REST) |

GraphQL API is also available and usually more efficient for batch queries.

Rate limits per hour: 60 unauthenticated, 5,000 with PAT. Authenticate.

## Workflow

### Step 1 — Resolve watchlist into repos

For each watchlist entry:
- If specific repo: use directly
- If org/user: list all public repos (paginate `/orgs/{org}/repos` or `/users/{user}/repos`)
- Optionally filter by language, last-pushed-at, or topic tags

Cache the resolved repo list; refresh weekly.

### Step 2 — For each repo, fetch and compute signals

For each repo on every scan, fetch:
- Current `stargazers_count`, `forks_count`, `open_issues_count`, `watchers_count`
- `pushed_at` (last commit), `updated_at` (last metadata change)
- Latest 5 releases (versions, dates, asset count)
- Last 50 commits (with author, date, message)
- Top 30 contributors (with contribution count)

Compute deltas vs. last scan:
- `stars_delta_period` — net new stars since last scan
- `commits_delta_period` — commits in the last period
- `releases_delta_period` — releases in the last period
- `new_contributors` — contributors who didn't exist last scan
- `last_release_age_days` — for cadence tracking

### Step 3 — Detect signals

Run each signal check per repo:

#### Star velocity spike
```
spike = stars_delta_period > (2.0 × 30-day_avg_stars_per_period)
       AND stars_delta_period >= 10
```

#### Sustained growth
```
sustained = current_stars > 1.10 × stars_30_days_ago
            AND current_stars > 1.20 × stars_60_days_ago
```

#### Release cadence acceleration
```
accel = releases_in_last_30_days > releases_in_prior_30_days
```

#### Stalled
```
stalled = days_since_last_commit > 60
          AND days_since_last_release > 90
```

#### New repo created
```
new_repo = repo created within last scan period
```

#### Repo archived
```
archived = repo.archived == true (newly archived since last scan)
```

#### Major dependency adoption
For repos with public dependency graphs, fetch `/repos/{owner}/{repo}/dependency-graph/sbom`. Compare against last scan's SBOM. Flag any net-new top-level dependency that maps to a strategic-tooling pattern (e.g., "added langchain" = building agents; "added Snowflake connector" = data stack).

### Step 4 — Score and prioritize

Each detected signal carries a priority:

| Signal | Priority |
|---|---|
| Major star velocity spike (>5× baseline) | High |
| Repo archived after 1+ year of activity | High (potential pivot/churn signal) |
| Strategic-tool dependency added | High |
| Sustained growth crossing 1k / 5k / 10k stars threshold | Medium |
| Release cadence acceleration | Medium |
| New repo in target org | Medium |
| Cadence drop (stalled) | Low (annotate; rarely triggers immediate outreach) |

### Step 5 — Cross-reference with target accounts

If your CRM or target-account list is provided:
- Match GitHub orgs/users to known companies (via known mappings, email-domain inference, or website URLs in profile)
- Tag any signals on target-account repos with the corresponding CRM record
- Push high-priority hits to the rep owning the account

This is where GitHub monitoring stops being curiosity and starts being pipeline.

### Step 6 — Output

```markdown
## GitHub Activity Scan — {date}

**Watchlist:** {N} repos / orgs
**Signals detected:** {M}
**High-priority:** {K}

---

### High-priority signals

#### {repo full_name}
- **Signal:** Star velocity spike — gained {N} stars in last 7 days (5× baseline)
- **Current stars:** {N}
- **Recent commit activity:** {N} commits in last 7 days, {M} contributors
- **Latest release:** {version} on {date}
- **Linked account:** {company name from CRM, if matched}
- **Sales implication:** {one line — e.g., "OSS hit traction window; budget conversation likely 60-90 days"}
- **Source:** [GitHub repo URL]

#### {next signal}...

### Medium-priority signals
{condensed table}

### Cadence drops (stalled repos)
{table — for awareness}

### Cross-account hits
{repos matched to CRM accounts, with rep owners}

### Output files
- `github-scan-{date}.md`
- `github-scan-{date}.csv`
- `github-baseline.json` — rolling 30-day per-repo baselines for spike detection
```

### Step 7 — Recipes

#### Recipe 1 — Devtools radar
Watchlist: top 200 OSS repos in your category. Cadence: daily. Filter to star velocity spikes only. Surfaces emerging tools 1-3 months before they hit Hacker News.

#### Recipe 2 — Account fit signals
Watchlist: GitHub orgs of your top-50 target accounts. Cadence: daily. Triggers: any new repo, dependency added, contributor count change.

#### Recipe 3 — Champion engineering signal
Watchlist: specific known champions' personal GitHub usernames. Triggers: new repos they create, organizations they join, languages they switch to. Useful for relationship-maintenance touches.

#### Recipe 4 — Competitor product velocity
Watchlist: specific competitor product repos. Cadence: weekly. Triggers: release cadence changes, contributor growth, dependency adds. Track competitor team scaling.

#### Recipe 5 — AI/ML adoption monitor
Watchlist: repos in your target accounts. Filter dependency-graph signals to AI tooling (langchain, llamaindex, transformers, openai SDK, anthropic SDK, etc.). Triggers when an account starts shipping AI features.

## Edge Cases

- **Private repos at target accounts** — invisible to the public API. Don't pretend you can see them. Cross-reference with public repos and inferred signals (job postings, public team activity) for the same outcome.
- **Star manipulation / bot accounts** — accounts with low followers / no profile / low contribution count may be artificial stars. The skill flags suspect-star clusters but doesn't auto-strip them.
- **Forks of popular repos** — a fork getting stars isn't the same as the original. Filter to original repos in spike detection.
- **Vendor / tool repos vs. company repos** — many companies have a "tools" repo that's not the main product. Tag-based filtering or maintaining a "main repo per company" map helps focus signal.
- **Inactive orgs that suddenly burst** — sometimes orgs go dormant for months and then re-activate. Worth watching, but the spike interpretation differs (it's not viral growth; it's product re-launch or pivot).

## Cost

| Component | Cost |
|---|---|
| GitHub API access | Free (rate-limited; PAT raises limits but PATs are free to create) |
| Per-repo signal computation | Free (local) |
| LLM for summary / interpretation | ~$0.001 per repo per scan |
| **Monthly cost, 200-repo watchlist, daily scan** | **~$5** |

## Tools Required

- HTTP client (built-in `fetch`)
- GitHub PAT (free; from github.com/settings/tokens) — for production-grade rate limit
- LLM for plain-English summaries and pattern interpretation
- Optional: Redis for baseline + scan state caching
- Optional: Slack webhook / Discord webhook / CRM annotation for delivery

## Trigger Phrases

- "Monitor GitHub for {Company}"
- "Find devtools with star spikes"
- "Track {Repo} activity"
- "Surface OSS adoption signals"
