---
name: negative-icp-scorer
description: Pre-send filter that runs an enriched prospect list through a "bad-fit signals" check (too small, wrong vertical, competitor partner, just churned a competitor, recently raised down-round, currently in a freeze, sanctioned, etc.) and removes high-friction targets before any emails are sent. Saves outbound credits and protects sender reputation.
tags: [lead-generation]
---

# Negative ICP Scorer

Most ICP definitions describe who you *want* to reach. This skill encodes who you *don't* — and removes them from a prospect list before anyone gets emailed. Costs almost nothing to run, but typically removes 10-30% of a "qualified" list, which translates directly into preserved Clay credits, fewer bounces, and lower spam-flag rate.

**Built for:** Outbound teams whose lists look qualified on paper but burn cycles on accounts that were never going to convert (employees of competitors, sanctioned entities, companies in active downturns, agencies pretending to be operators, freelancers using corporate emails).

## When to Use

- "Filter this list before I push it to Smartlead"
- "Run the negative ICP scan on this enriched CSV"
- "Strip the bad fits out of my Clay export"
- "Pre-send check: who shouldn't get this email"

## What It Catches

The skill runs a parallel set of signal checks against each row. Categories:

### Hard fails (always remove)
- **Competitor employee** — domain or company name matches a known competitor
- **Sanctioned entity** — country/company on OFAC, EU, or UK sanctions lists
- **Already-suppressed** — present in the team's unsubscribe / DNE list
- **Existing customer** — domain or company matches active customer base
- **Active opportunity** — company has an open deal in your CRM owned by a teammate
- **Closed-won < 12 months** — recent win; route to CSM, not new sales

### Soft fails (remove with reason; reviewable)
- **Wrong vertical** — industry tag doesn't match ICP and isn't an adjacent fit
- **Wrong size** — headcount well below or above ICP band (default tolerance ±50% of band)
- **Wrong stage** — pre-seed company when ICP is Series B+, or vice versa
- **Wrong geography** — non-target region with no obvious office in target region
- **Job title mismatch** — title is too junior (intern, analyst at small co), too senior off-target (board member who isn't operational), or in an irrelevant function
- **Personal email domain** — gmail.com, yahoo.com, outlook.com on a B2B prospect (lone freelancer signal)
- **Agency / consultancy** — when ICP is operators, not service firms — match against agency-name patterns

### Risk flags (downrank, don't remove)
- **Layoffs in last 90 days** — they may not have budget, but could; flag and proceed at lower priority
- **Down-round / distressed funding** — recent round at lower valuation; budget may be tight
- **Active lawsuit / regulatory action** — distracted; flag for sales judgment
- **Hiring freeze / mass exit** — flag and downrank
- **Fresh CFO / CRO change** — purchasing decisions paused 60-90 days; downrank, set re-engage date

### Quality flags (data hygiene)
- **No verified email** — would bounce; remove or send to enrichment
- **Catch-all domain** — info@, contact@, hello@; deliver but expect lower rates
- **Generic role inbox** — sales@, marketing@; downrank
- **Disposable email** — guerrillamail, mailinator, etc.; remove

## Inputs

Required:
- **Prospect list** — CSV with at minimum: company name, domain, contact email, title. More fields = more accurate scoring.

Configuration (per-client, set once):
- **Competitor list** — domains + company name variants
- **ICP definition** — industry, size band, stage, geography, target titles
- **Suppression list** — unsubscribes, DNE, customers
- **CRM access** — to check existing pipeline and customers
- **Tolerance settings** — strict / standard / loose (default: standard)

## Workflow

### Step 1 — Load configuration

On first run, set up `negative-icp.config.json`:

```json
{
  "competitor_domains": ["competitor1.com", "competitor2.com"],
  "competitor_name_patterns": ["competitor 1", "competitor 2"],
  "icp": {
    "industries": ["b2b saas", "fintech"],
    "excluded_industries": ["agency", "consultancy", "education"],
    "min_employees": 50,
    "max_employees": 5000,
    "stages": ["series_a", "series_b", "series_c", "growth", "public"],
    "geographies": ["us", "ca", "uk", "eu"],
    "target_titles": ["vp", "director", "head of"],
    "excluded_titles": ["intern", "student", "analyst", "consultant"]
  },
  "suppression_source": {
    "tool": "csv | hubspot | salesforce | redis_set",
    "path_or_id": ""
  },
  "crm": {
    "tool": "hubspot | salesforce | csv | none",
    "access_method": ""
  },
  "tolerance": "strict | standard | loose"
}
```

### Step 2 — Run signal checks per row

For each prospect, run checks in this order. Stop on first hard fail.

#### Hard-fail checks (terminate scoring on hit)

1. Domain in `competitor_domains`? → flag `competitor_employee`
2. Email present in suppression source? → flag `suppressed`
3. Domain in current customer list? → flag `existing_customer`
4. Company name in active CRM opportunity (different rep)? → flag `active_opp_other_rep`
5. Closed-won < 12 months ago? → flag `recent_win_route_to_csm`
6. Domain on sanctions list? → flag `sanctioned`

#### Soft-fail checks (run all; accumulate reasons)

7. Industry tag in `excluded_industries`? → soft fail `wrong_vertical`
8. Headcount outside ICP band (with tolerance)? → soft fail `wrong_size`
9. Stage not in ICP stages? → soft fail `wrong_stage`
10. HQ country not in target geography (and no office in target)? → soft fail `wrong_geography`
11. Title matches `excluded_titles` or doesn't match `target_titles`? → soft fail `wrong_title`
12. Email on personal domain (gmail/yahoo/outlook) for B2B target? → soft fail `personal_email`
13. Company name matches agency/consultancy patterns? → soft fail `agency_consultancy`

#### Risk flags (don't fail; annotate)

14. Layoff news in last 90 days? → risk flag `recent_layoffs`
15. Recent down-round (last 180 days)? → risk flag `down_round`
16. Active lawsuit / regulatory action? → risk flag `legal_distraction`
17. Hiring freeze (no jobs posted in 60+ days when previously active)? → risk flag `hiring_freeze`
18. CFO/CRO/CEO change in last 90 days? → risk flag `recent_exec_change`

#### Quality flags

19. Email verification status (if available) — invalid → remove; risky → quality flag
20. Generic role inbox? → quality flag `generic_inbox`
21. Disposable email domain? → remove

### Step 3 — Apply tolerance

Tolerance level controls how strict soft fails are:

| Tolerance | Soft-fail behavior |
|---|---|
| `strict` | Any soft fail removes the row |
| `standard` (default) | 2+ soft fails remove; 1 = downrank flag |
| `loose` | Soft fails are flags only; nothing removed for soft fails |

Hard fails always remove regardless of tolerance.

### Step 4 — Output

CSV with columns appended to the original input:

```
verdict, removed, reasons, risk_flags, quality_flags, score, recommended_action
```

- `verdict`: `keep` | `downrank` | `remove`
- `removed`: boolean
- `reasons`: comma-separated tokens (e.g., `competitor_employee`, `wrong_size,wrong_title`)
- `risk_flags`: comma-separated risk tokens
- `quality_flags`: comma-separated quality tokens
- `score`: 0-100 (100 = pristine fit, 0 = remove)
- `recommended_action`: `send_now` | `enrich_first` | `route_to_csm` | `route_to_other_rep` | `re_engage_in_60d` | `suppress_globally` | `do_not_email`

### Step 5 — Summary report

```markdown
## Negative ICP Scan — {date}, {N_input} rows

### Removals: {N_removed} ({pct}%)

| Reason | Count | % of input |
|---|---|---|
| Competitor employee | ... | ... |
| Existing customer | ... | ... |
| Active opp (other rep) | ... | ... |
| Suppressed | ... | ... |
| Wrong vertical | ... | ... |
| Wrong size | ... | ... |
| Personal email | ... | ... |
| ... | ... | ... |

### Risk flags: {N_risk} (kept but downranked)
- Recent layoffs: {N}
- Down-round: {N}
- Exec change: {N}

### Routing recommendations
- Route to CSM (existing customer with expansion potential): {N}
- Route to other AE (active opp): {N}
- Suppress globally: {N}

### Estimated savings
- Email credits saved: {N_removed}
- Clay enrichment credits saved: {N_removed × avg cost}
- Estimated bounce reduction: ~{pct}% on remaining list

### Output saved to: {path}
```

## Configuration Tips

- **Competitor list maintenance** — add a script or workflow to refresh this monthly. Acquisitions happen.
- **Excluded titles** are vertical-specific. For SaaS, "consultant" is a common one. For agencies/services firms, "consultant" might be the *target*. Tune per client.
- **Tolerance** — start at `standard`. If reps say the list still looks bad, move to `strict`. If it's removing too much, look at the specific reasons before moving to `loose` — the right move is usually to refine the ICP definition, not loosen the filter.

## Edge Cases

- **Subsidiary of a competitor** — competitor `acme.com` owns `acme-data.com`. Maintain a list of subsidiary domains in `competitor_domains`. The skill won't infer ownership.
- **Big company with mixed brands** — the parent might be a customer while a different brand isn't. Match on domain, not parent name. If the prospect is at a different brand domain, treat as new logo.
- **Personal-looking emails that are real** — at small companies, the founder's email might be `name@domain.com` where `domain.com` looks personal. Check headcount: if company has ≥3 employees and a website, allow it.
- **VC-backed competitors** — VCs hold portfolio info; reaching their founders/operators usually OK, but their internal team (analysts, partners) is `competitor_employee`. Maintain VC firm domains separately if relevant.

## Cost

| Component | Cost per row |
|---|---|
| Domain/competitor checks | Free |
| Suppression check (Redis lookup) | ~$0 |
| CRM lookup | API-dependent (HubSpot ~free, Salesforce $$ at high volume) |
| Risk-signal checks (web search for recent layoffs, etc.) | ~$0.02 if done; can disable |
| LLM judgment for ambiguous title/industry | ~$0.001 |
| **Total typical, 10k rows** | **~$5-15** |

The skill saves dramatically more than it costs (Clay credits, email warmup damage, reply triage time).

## Tools Required

- Read access to the prospect list
- Read access to suppression list, customer list, CRM (read-only is fine)
- Optional: web search for recent-layoff / down-round / exec-change signals (the risk flags). Without this, those flags are skipped.
- Optional: LLM for industry/title classification when tags are missing

## Trigger Phrases

- "Run the negative ICP scan on this list"
- "Filter this list before I push to Smartlead"
- "Strip bad fits from this Clay export"
- "Pre-send check this CSV"
