---
name: npm-pypi-trend-tracker
description: >
  Track download velocity for npm and PyPI packages — surface week-over-week
  spikes, sustained growth, and emerging packages in a target category.
  Reveals developer-tool adoption signals 6-12 months before they hit
  Hacker News or industry analyst reports. Free public APIs, no key.
  Useful for devtools competitive intel, AI/ML stack tracking, and
  identifying the small libraries that are about to be acquisition
  targets.
tags: [research, competitive-intel]
---

# npm + PyPI Trend Tracker

Open-source package adoption is one of the cleanest leading indicators in dev-facing markets. Before a tool shows up in Forrester reports or hits an analyst's radar, it's accruing weekly downloads on npm or PyPI. This skill watches the package registries for velocity spikes and sustained growth so you can surface adoption shifts 6-12 months early.

**Built for:** Devtools companies running competitive intel, AI/ML teams tracking the LLM tooling stack, and GTM teams selling into developer audiences who want to know which libraries their prospects are actually adopting.

## When to Use

- "Track npm/PyPI for {category}"
- "Find emerging dev libraries this quarter"
- "Show me velocity spikes in AI/ML packages"
- "Run the developer-tool adoption scan"

## Data Sources (Free)

| Registry | API | What it gives |
|---|---|---|
| **npm** | `https://api.npmjs.org/downloads/range/{period}/{package}` | Daily download counts |
| **npm** | `https://api.npmjs.org/downloads/point/{period}/{package}` | Aggregated download point |
| **npm** | `https://registry.npmjs.org/{package}` | Package metadata, versions, dependents |
| **PyPI** | `https://pypistats.org/api/packages/{package}/recent` | Daily/weekly/monthly download counts |
| **PyPI** | `https://pypi.org/pypi/{package}/json` | Package metadata, classifiers |
| **libraries.io** | `https://libraries.io/api/{platform}/{package}` (key required, free tier) | Cross-registry data + dependent count |
| **GitHub Search** | `https://api.github.com/search/repositories?q={topic}` | Find packages by topic/keyword |

The first three are completely free with no auth required (just rate-limited).

## Inputs

Required:
- **Watchlist** — packages to monitor. Two modes:
  1. **Explicit list** — known packages by name + registry
  2. **Category discovery** — search keywords (`["llm framework", "vector database", "data orchestration"]`) and the skill discovers packages

Optional:
- **Cadence** — `daily` / `weekly`. Default: weekly (download data is aggregated weekly anyway).
- **Spike threshold** — ratio of recent week to baseline. Default: 2× baseline + ≥1,000 weekly downloads minimum (filters noise).
- **Categories** — semantic tags for grouping packages (e.g., `["ai-frameworks", "vector-stores", "data-pipeline"]`)
- **Cross-reference** — list of target accounts whose tech stack you're tracking; the skill flags adoption matches.

## Workflow

### Step 1 — Resolve watchlist

For each entry:
- If explicit package name + registry: use directly
- If category discovery: search GitHub for repos with matching keywords + topic tags, filter to those with npm/PyPI publishes, add to watchlist

Cache the resolved list; refresh weekly.

### Step 2 — Pull download data

For each package in the watchlist:

#### npm
```
GET https://api.npmjs.org/downloads/range/last-12-weeks/{package}
```

Returns daily download counts for the last 12 weeks.

#### PyPI
```
GET https://pypistats.org/api/packages/{package}/recent?period=week
```

Returns weekly counts.

Aggregate both into a normalized weekly time-series.

### Step 3 — Compute signals

For each package:

```
weekly_downloads_current: most recent complete week
weekly_downloads_prior: week before
weekly_downloads_baseline: trimmed mean of weeks 5-12 (drop top + bottom 1)
sd_baseline: std dev of baseline period

velocity_ratio = weekly_downloads_current / weekly_downloads_baseline
sustained_growth = current > 1.10 × downloads_30_days_ago AND current > 1.20 × downloads_60_days_ago
```

#### Signals
- **Velocity spike:** `velocity_ratio ≥ spike_threshold AND current ≥ min_threshold`
- **Sustained growth:** `sustained_growth == True`
- **Threshold crossing:** package crossed 1k / 10k / 100k / 1M weekly downloads since last scan
- **Acceleration:** week-over-week growth itself is accelerating (current_growth > prior_growth + 0.20)
- **Decline reversal:** package was declining for 4+ weeks, now growing
- **New package emerging:** first appeared in registry in last 90 days, already crossing 1k weekly

### Step 4 — Pull metadata for spiking packages

For any package firing a signal, fetch:

- Description, README excerpt
- Maintainer (the person/org publishing)
- Dependent count (libraries.io if available)
- GitHub stars + recent activity
- Release frequency (versions per month)
- License + framework category

### Step 5 — Categorize

Auto-classify spiking packages by:
- Tags from the registry (npm keywords, PyPI classifiers)
- README content analysis
- GitHub repo topics

Common high-signal categories:
- AI / ML frameworks
- LLM / agent frameworks (e.g., langchain, llamaindex, dspy)
- Vector stores
- Data orchestration / ETL
- API frameworks
- Observability / monitoring
- Testing / QA
- DevOps / infra-as-code
- Auth / identity
- Frontend frameworks

### Step 6 — Cross-reference

If target accounts list is provided:
- For each target account, check if their package.json / pyproject.toml / requirements.txt are publicly visible (open-source repos, public GitHub orgs)
- If yes: detect when target accounts add a watched package as a dependency
- This is a strong signal: target account is actively building on the watched library

### Step 7 — Output

```markdown
## npm + PyPI Trend Scan — {date}

**Packages monitored:** {N} (npm: {N1}, PyPI: {N2})
**Spikes detected:** {M}
**Sustained growth:** {K}
**New emerging packages:** {J}

---

### Velocity spikes ({M})

#### {package_name} ({registry}) — {category}
- **Current weekly downloads:** {N}
- **vs. baseline:** {ratio}× ({prior_baseline} weekly)
- **GitHub stars:** {stars} (+{delta} since last scan)
- **Release cadence:** {versions/month}
- **Maintainer:** {org/person}
- **Description:** {one-line README excerpt}
- **Why this matters:** {LLM-generated context — e.g., "Crossed 100k weekly downloads after a viral HN post about AI agent observability; competitor in the {category} space"}
- **Cross-reference hit:** {if any target account has adopted this package}
- **Source:** {npm URL / PyPI URL}

#### Next package...

### Sustained growth ({K})
{condensed table — packages with steady upward trend, not spike-y}

### New emerging packages ({J})
{packages first published in last 90 days that already have meaningful traction}

---

### Category trends

| Category | Total weekly downloads | Δ vs. last quarter | Top growing package |
|---|---|---|---|
| AI/LLM frameworks | 12.4M | +28% | langgraph |
| Vector stores | 3.1M | +11% | qdrant-client |
| Data orchestration | ... | ... | ... |

---

### Cross-reference hits

| Target account | Adopted package | When detected | Context |
|---|---|---|---|
| {account} | {package} | {date} | {their public repo / commit reference} |

---

### Output files
- `trend-scan-{date}.md`
- `trend-scan-{date}.csv` — per-package data
- `package-baselines.json` — rolling baselines for next scan
```

### Step 8 — Recipes

#### Recipe 1 — AI/LLM stack tracker
Watchlist: top 50 AI framework packages (langchain, llamaindex, dspy, instructor, openai, anthropic SDK, mistralai, etc.). Cadence: weekly. Surfaces emerging frameworks before they get covered by media.

#### Recipe 2 — Competitor library watch
Watchlist: your competitor's open-source libraries (if they have any). Cadence: weekly. Decline = potential opportunity to position alternatives.

#### Recipe 3 — Stack-fit signals for sales
Watchlist: libraries that integrate with your product OR libraries that signal pain you solve. Cross-reference with target accounts' public repos to detect when an account adopts a library that signals readiness for your product.

#### Recipe 4 — Acquisition target radar
Watchlist: small but rapidly-growing packages in your category. Sustained-growth + small-team-maintainer often precedes acquisition by 12-18 months.

## Edge Cases

- **Package was renamed** — npm/PyPI track by name; if a package is renamed, the new name shows as "new emerging" while the old name shows decline. Manually link them.
- **Bot downloads** — large download spikes can be CI/CD systems or scrapers. Cross-reference GitHub stars + dependents; downloads without proportional dependent growth are suspect.
- **Mirror packages** — some packages are mirrored from one registry to another, inflating download counts. Common with Python packages that have npm shadow packages. Filter out where the README points to a different canonical source.
- **Yanked / deprecated packages** — exclude from scan; they're not adoption signals.

## Cost

| Component | Cost |
|---|---|
| npm + PyPI API access | Free |
| Per-package signal computation | Free (local) |
| LLM categorization + description (per spiking package) | ~$0.005 |
| Cross-reference vs. target accounts | ~$0.01 per account |
| Report generation | ~$0.05 |
| **Per scan, 100-package watchlist** | **~$1-3** |

## Tools Required

- HTTP client with rate limiting (npm: ~30 req/min, PyPI: ~100/min)
- LLM for categorization
- Optional: GitHub API for stars/activity
- Optional: libraries.io API for cross-registry context

## Trigger Phrases

- "Track npm/PyPI for {category}"
- "Find emerging dev libraries"
- "Show velocity spikes in AI/ML packages"
- "Run developer-tool adoption scan"
