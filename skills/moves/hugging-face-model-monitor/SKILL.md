---
name: hugging-face-model-monitor
description: >
  Monitor Hugging Face for model uploads, dataset publications, and
  Spaces by a target organization or person. Detect when companies
  start publishing AI artifacts publicly, what categories they're
  working in, and which engineers are leading the work. Reveals AI
  product investment 12+ months before launch announcements. Free,
  no API key required.
tags: [research]
---

# Hugging Face Model Monitor

Hugging Face is the open ML registry — when a company starts shipping models, datasets, or Spaces there, it's signaling AI investment that won't show up in their press releases for 6-18 months. This skill watches HF for those signals at the org and individual level, classifying each artifact and flagging strategic shifts.

**Built for:** GTM teams selling into the AI / ML stack, competitive intel teams tracking AI startups, and anyone who needs to know what AI work is happening at target accounts before it becomes public.

## When to Use

- "Watch Hugging Face for {Company}"
- "Find AI startups publishing recent models"
- "Track ML artifact uploads by {Org}"
- "Run the HF scan on our target accounts"

## What HF Activity Reveals

| Signal | Inference |
|---|---|
| First model published by an org | They've started doing AI work seriously |
| Sustained model uploads (≥1/month) | Active AI engineering team |
| Model fine-tuned on specific data | Domain-specific use case (vertical AI) |
| Dataset published | They have proprietary data they're willing to share |
| Spaces (deployed demos) | Customer-facing or partner-facing AI product imminent |
| New collaborators joining the org | AI hiring expansion |
| Model deletions / unlisting | Strategy pivot or regulatory pressure |
| Quantized/optimized variants | Production deployment imminent |

## Data Source (Free)

Hugging Face has a free, well-documented API at `https://huggingface.co/api`:

| Endpoint | Use |
|---|---|
| `/api/models?author={org}` | List all models by an org |
| `/api/datasets?author={org}` | List all datasets |
| `/api/spaces?author={org}` | List all Spaces |
| `/api/models/{id}` | Model detail (downloads, likes, last-modified, base model, tags) |
| `/api/users/{username}/overview` | User activity overview |
| `/api/organizations/{org}/overview` | Org activity overview |

No authentication for public content. Rate-limited generously (~thousands of req/hour).

## Inputs

Required:
- **Watchlist** — orgs and/or individuals on HF. Each entry: HF username/org slug, optional company name mapping.

Optional:
- **Cadence** — `daily` / `weekly`. Default: weekly.
- **Category filters** — only flag specific model categories (e.g., `["text-generation", "image-segmentation"]`)
- **Cross-reference target accounts** — list of company names; the skill resolves to HF orgs and tracks them

## Workflow

### Step 1 — Resolve watchlist

For each entry, fetch the org/user overview to confirm existence and cache:
- Username/org slug
- Display name
- Number of models / datasets / Spaces
- Affiliation (org or individual)
- Linked website / company

If a company name was given, search for matching HF org via:
1. Direct username guess (lowercase, no spaces) — `https://huggingface.co/{guess}`
2. Org search — `https://huggingface.co/api/organizations/{slug}`
3. Verify via website link match

Cache the mapping; refresh monthly.

### Step 2 — Pull recent activity per org

For each org, fetch:

- **New models** uploaded since last scan: `GET /api/models?author={org}&sort=createdAt&direction=-1`
- **Updated models**: those with `last_modified > last_scan`
- **New datasets**: same pattern
- **New Spaces**: same pattern
- **New collaborators** (members joining the org)

For each new artifact, capture:
- ID, name, description (from README/cardData)
- Tags (model_type, library, language, license, base_model, datasets used)
- Downloads + likes
- Created date, last_modified date
- Pipeline tag (text-generation, image-classification, etc.)
- Model size (parameters if disclosed)
- Quantization status

### Step 3 — Classify and contextualize

For each new artifact, run an LLM pass:

- **Category**: text-generation / image / multimodal / speech / RL / etc.
- **Likely use case** (inferred from name + tags + base model): "vertical fine-tuning of {base model} for {domain}", "production-optimized variant", "research artifact", etc.
- **Strategic significance**:
  - First artifact in this category from this org → strategic shift
  - Continuation of existing line → execution
  - Novel base model → R&D direction signal
  - Quantized/distilled variant → production deployment imminent
- **Underlying base model** (if fine-tuned): tells you which family they're building on (Llama, Mistral, Qwen, internal, etc.)

### Step 4 — Detect patterns

Beyond per-artifact summary, the skill tracks:

- **Velocity changes**: orgs going from 0 → 5 models in a quarter signal a major investment
- **Category shifts**: org's first non-text model after years of text-only signals diversification
- **Engineer joins**: new contributors to an org are AI hiring signals (cross-reference LinkedIn)
- **Model deletion patterns**: bulk delisting can signal compliance pressure or pivot
- **Spaces with public demos**: a public Space is the closest HF gets to "we have a product"; cross-reference with their main site for product launch correlation

### Step 5 — Score significance

Each artifact gets a significance score:

| Factor | Weight |
|---|---|
| First artifact in this category from this org | +30 |
| Quantized / production-optimized variant | +25 |
| Public Space (deployable demo) | +25 |
| Fine-tuned on org's named domain dataset | +20 |
| New collaborator's first contribution | +15 |
| Trending (Top-N HF leaderboard) | +20 |
| Continuation of existing model family | -10 |
| Research paper attached | +10 |

Score ≥50: report prominently.
25-49: include in summary table.
<25: roll up into the count.

### Step 6 — Output

```markdown
## Hugging Face Activity Scan — {date}

**Orgs/users monitored:** {N}
**New artifacts since last scan:** {M} (models: {M1}, datasets: {M2}, Spaces: {M3})
**High-significance artifacts:** {K}
**Velocity changes:** {J}

---

### High-significance activity

#### {Org name} — {orgs HF link}
- **Velocity:** {N artifacts in last 30 days, vs. {M} in prior 30}
- **Direction signals:** {LLM-generated insight — e.g., "First multimodal model after a year of text-only; likely product expansion"}

##### {New artifact 1}: "{Name}"
- **Type:** {model | dataset | Space}
- **Category:** {pipeline tag}
- **Base model:** {base model name if fine-tuned}
- **Significance:** {score}
- **Plain summary:** {LLM-generated 1-3 sentences}
- **Why it matters:** {one line — e.g., "Fine-tuned on legal docs; suggests vertical-AI product for legal customers"}
- **Source:** [HF link]

##### {Next artifact}...

#### {Next org}...

### Velocity changes
{orgs whose publication pace shifted significantly}

### New collaborators
{cross-reference with LinkedIn for AI hiring signals}

### Spaces (public demos) launched
{any Space launched is a strong product-readiness signal}

### Output files
- `hf-scan-{date}.md`
- `hf-scan-{date}.csv` — per-artifact data
- `hf-direction-history.json` — rolling category counts per org
```

### Step 7 — Cross-skill triggers

- **First model in a category** → fire `competitor-research` refresh on that org's parent company
- **Quantized variant published** → flag for AE owning the account; production deployment likely
- **Public Space launched** → flag as "product-imminent" for sales motion
- **Engineer joined / first contribution** → cross-reference LinkedIn; possible champion candidate or signal of org expansion

## Recipes

#### Recipe 1 — AI competitor radar
Watchlist: HF orgs of your top AI competitors. Cadence: weekly. Triggers: any new model, especially in your category.

#### Recipe 2 — Vertical AI emergence
Watchlist: top 50 vertical-SaaS companies in a target industry. Cadence: monthly. Triggers: first model upload (signals AI product motion).

#### Recipe 3 — AI buyer-readiness
Watchlist: target accounts. Cross-reference with sales pipeline. When a target uploads their first model, flag for the AE — they're now an active AI buyer.

#### Recipe 4 — Talent / champion signals
Watchlist: known AI engineers (champions, former colleagues, key contributors). Triggers: their first contribution to a new org = job change.

## Edge Cases

- **Org publishes only private models** — invisible. Flag as known limitation.
- **Test / scratch models** — orgs sometimes publish experiments. Filter by downloads (≥10) or by README quality (real READMEs vs. empty).
- **Forked / mirrored models** — common to fork a model, retag, and republish. Detect via base model identity; flag forks separately from genuine new work.
- **Org consolidations** — sometimes orgs migrate models between accounts. Maintain alias mapping where known.

## Cost

| Component | Cost |
|---|---|
| HF API access | Free |
| Per-artifact LLM classification | ~$0.005 |
| Per-org direction analysis | ~$0.01 |
| Cross-reference + report | ~$0.05 |
| **Per scan, 50-org watchlist, weekly** | **~$2-5/month** |

## Tools Required

- HTTP client (built-in `fetch`)
- LLM for classification + insight generation
- Optional: cross-reference with `linkedin-profile-post-scraper` (existing) for engineer-join signals
- Optional: cross-reference with `competitor-research` (existing) for parent-company context

## Trigger Phrases

- "Watch Hugging Face for {Company}"
- "Find AI startups publishing recent models"
- "Track ML artifact uploads by {Org}"
- "Run the HF scan on target accounts"
