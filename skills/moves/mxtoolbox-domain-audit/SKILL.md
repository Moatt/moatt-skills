---
name: mxtoolbox-domain-audit
description: >
  Audit a sending domain's email-deliverability posture — SPF, DKIM,
  DMARC, MX, blacklists, BIMI, MTA-STS — and produce a fix list ranked
  by deliverability impact. Run on every domain you send outbound from
  before launch; rerun monthly. Uses the public MXToolbox-equivalent
  DNS lookups (free, no key required) plus standard blacklist checks.
  The single most important pre-launch check for any cold-email
  campaign.
tags: [outreach]
---

# MXToolbox Domain Audit

Most outbound deliverability problems are pre-existing DNS configuration issues, not content problems. SPF flat-out missing, DKIM key not published, DMARC set to `p=none` for years — these silently route mail to spam. This skill audits the configuration of a sending domain and produces a fix list with the specific records to change.

**Built for:** Outbound and email-marketing teams that want to verify deliverability hygiene before launching a cold campaign or onboarding a new sending domain.

## When to Use

- "Audit deliverability for {domain}"
- "Run the MX/SPF/DKIM/DMARC check on {domain}"
- "Pre-launch deliverability audit"
- "Why are our emails landing in spam?"

## What the audit checks

### DNS records (per domain)

| Record | Purpose | Failure mode |
|---|---|---|
| **MX** | Email routing | Missing or misconfigured = email won't deliver |
| **SPF** (TXT) | Authorize sending IPs | Missing = mail likely in spam; >10 lookups = SPF flattening needed |
| **DKIM** (TXT, selector-specific) | Signing key | Missing = unsigned mail; rejected by strict receivers |
| **DMARC** (TXT, `_dmarc.{domain}`) | Auth policy | `p=none` after 30 days = signal of misconfiguration |
| **BIMI** (TXT, `default._bimi.{domain}`) | Brand logo in inbox | Optional but increasing in importance |
| **MTA-STS** (TXT, `_mta-sts.{domain}`) | Transport security | Optional; quality signal |
| **TLS-RPT** (TXT, `_smtp._tls.{domain}`) | TLS reporting | Optional |

### Blacklist checks
- Domain blacklists (Spamhaus, SURBL, URIBL)
- IP blacklists (for the IPs in the SPF record)

### Auxiliary checks
- Reverse DNS (PTR) for sending IPs
- Server certificate validity
- Open relay testing

## Inputs

Required:
- **Domain** — the sending domain to audit. e.g., `mail.acme.com`

Optional:
- **DKIM selectors** — the team's DKIM selectors (e.g., `s1`, `google`, `mailgun`). The audit attempts common selectors if unspecified, but explicit list is more reliable.
- **Sending IPs / IP ranges** — for blacklist + reverse-DNS check. Often discoverable from SPF.
- **Cadence** — `one-shot` / `weekly` / `monthly`. Default: monthly for ongoing monitoring.

## Workflow

### Step 1 — DNS lookup pass

For the target domain, query each record type:

```
# Direct via DNS resolver
dig MX {domain}
dig TXT {domain}                       # for SPF
dig TXT {selector}._domainkey.{domain} # for DKIM (per selector)
dig TXT _dmarc.{domain}                # for DMARC
dig TXT default._bimi.{domain}         # for BIMI
dig TXT _mta-sts.{domain}              # for MTA-STS
dig TXT _smtp._tls.{domain}            # for TLS-RPT
```

(Implementation: any DNS client library; Node has `dns` built-in.)

### Step 2 — Validate each record

#### SPF
- Present?
- Starts with `v=spf1`?
- All mechanisms valid?
- DNS lookups inside SPF (`include:`, `redirect=`, `mx`, `ptr`) total ≤ 10? (RFC 7208 limit; >10 = mail rejected)
- Ends with `~all` or `-all`? (`+all` is dangerous; missing trailing mechanism is a failure)
- Authorized senders match the team's actual sending infrastructure?

#### DKIM
- Selector resolves?
- Public key present and well-formed?
- Key length ≥ 1024 bits (2048 preferred)?
- `t=y` (test mode) in the record? (Should not be in production)

#### DMARC
- Present?
- Policy: `p=none` / `p=quarantine` / `p=reject`?
- `rua=` reporting address set?
- `pct=` is full enforcement (100) or partial?
- `aspf=` and `adkim=` alignment modes?
- DMARC age — if `p=none` for >180 days without progression, flag as stalled

#### MX
- Present?
- Resolves to valid mail servers?
- Backup MX with appropriate priority?

#### BIMI / MTA-STS / TLS-RPT
- Optional but each presence is a small reputation boost
- BIMI requires DMARC at p=quarantine or stricter

### Step 3 — Blacklist check

For the domain + the sending IPs (parsed from SPF):

Common public blacklist sources to query:
- Spamhaus: SBL, CSS, PBL, ZEN
- SURBL: ws.surbl.org
- URIBL: black.uribl.com
- Sender Score Reputation
- Barracuda Reputation
- AbuseAt CBL

Query each via DNSBL lookup pattern (reverse the IP, append the blacklist hostname, check for any A record).

### Step 4 — Reverse DNS (PTR)

For each sending IP, query the PTR record. Best practice: PTR matches the EHLO hostname which matches the A record (full FCrDNS — Forward-Confirmed reverse DNS).

### Step 5 — Score the audit

Composite deliverability score 0-100:

| Check | Weight | Impact |
|---|---|---|
| MX records valid | 20 | Hard fail without these |
| SPF present + valid | 15 | Strong receiver signal |
| SPF lookup count ≤ 10 | 10 | Common breakage point |
| DKIM present + signed | 15 | Required by stricter receivers |
| DMARC present | 10 | Emerging requirement |
| DMARC at quarantine/reject | 10 | Strong reputation signal |
| Not on any blacklist | 15 | Catastrophic if blacklisted |
| FCrDNS configured | 5 | Quality signal |

### Step 6 — Generate the fix list

For each detected issue, output a specific fix:

```json
{
  "issue": "<one-line>",
  "severity": "critical | high | medium | low",
  "current_state": "<what's currently there>",
  "fix": {
    "record_type": "TXT | DKIM TXT | DMARC TXT | MX | etc",
    "host": "<host to update>",
    "current_value": "<current record>",
    "recommended_value": "<exact recommended record>",
    "rationale": "<why this matters for deliverability>",
    "ease": "easy | medium | hard"
  }
}
```

### Step 7 — Output

```markdown
## Deliverability Audit — {domain} — {date}

**Composite score:** {N}/100 — **{tier: Strong / Moderate / Weak}**

---

### Summary

| Check | Status | Score |
|---|---|---|
| MX | ✓ Valid | 20/20 |
| SPF — present | ✓ | 15/15 |
| SPF — lookup count | ⚠️ 12 lookups | 5/10 |
| DKIM (selector "s1") | ✓ 2048-bit | 15/15 |
| DKIM (selector "s2") | ✗ Not found | 0/(implicit fail) |
| DMARC — present | ✓ | 10/10 |
| DMARC — enforcement | ⚠️ p=none for 8 months | 3/10 |
| Blacklists | ✓ Clean | 15/15 |
| FCrDNS | ⚠️ Partial | 2/5 |

---

### Critical issues
1. **SPF lookup count too high (12 of 10 max)** — receivers will reject SPF when count exceeds 10. Flatten by including IPs directly or via subdomain delegation. {Specific recommended record provided.}

### High-priority issues
2. **DMARC stuck at p=none for 8 months** — receivers downweight domains that don't progress. Move to `p=quarantine; pct=10` for 30 days, then ramp.
3. **DKIM selector "s2" not resolving** — SPF says traffic comes from this sender but DKIM key isn't published. Either publish the key or remove from SPF.

### Medium-priority issues
4. **PTR for IP {x.x.x.x} doesn't match EHLO hostname** — partial FCrDNS; quality signal for top providers.

### Low-priority opportunities
5. **No BIMI record** — would enable logo display in supporting mail clients.
6. **No MTA-STS** — quality signal for Gmail; recommended setup if sending volume is significant.

---

### Specific fixes (copy-paste-ready)

#### Fix 1: SPF lookup count
**Current SPF:** `v=spf1 include:_spf.google.com include:mailgun.org include:sendgrid.net ip4:1.2.3.4 ~all`

**Recommended:** Either reduce includes or split into subdomain SPFs:
```
v=spf1 include:_spf.acme.com ip4:1.2.3.4 ~all
```

Where `_spf.acme.com` aggregates the `mailgun + sendgrid` includes via flattened IP list.

#### Fix 2: DMARC enforcement progression
**Current DMARC:** `v=DMARC1; p=none; rua=mailto:dmarc@acme.com`

**Recommended:** Progress to quarantine in stages:
```
v=DMARC1; p=quarantine; pct=10; rua=mailto:dmarc@acme.com; ruf=mailto:dmarc@acme.com; aspf=r; adkim=r
```

After 30 days of clean reports: increase `pct=10` → `pct=50` → `pct=100`. After another 60 days clean: progress `p=quarantine` → `p=reject`.

#### Fix 3: ...

---

### Output files
- `audit-{domain}-{date}.md` — this report
- `audit-{domain}-{date}.json` — structured fix list
- `audit-{domain}-{date}.csv` — for ticketing
```

### Step 8 — Re-audit cadence

Schedule monthly re-audits to catch:
- New blacklist hits
- DKIM key rotation issues
- New IPs added to SPF without DKIM published
- DMARC report-volume changes signaling abuse

## Edge Cases

- **Subdomain audits** — many teams send from `mail.acme.com` or `email.acme.com`. The audit should run on the *exact* sending subdomain, not just the apex. Apex domains often have stricter inheritance rules.
- **Multiple sending platforms** — domain has separate DKIM keys per platform. Audit each selector explicitly.
- **DMARC at apex but subdomain sends** — DMARC inheritance applies but selectors don't. Audit at the level mail actually originates.
- **Catch-all email forwarding** — forwarding can break SPF. Detect and flag.
- **Newly-created domain** — domain is too fresh for blacklists and DMARC reports to be meaningful. Flag the age and recommend warm-up before scaling.

## Cost

| Component | Cost |
|---|---|
| DNS lookups | Free |
| Blacklist queries (DNSBL) | Free |
| LLM for fix generation + recommendation rationale | ~$0.05 per audit |
| **Per audit** | **~$0.05-0.10** |

## Tools Required

- DNS resolver (built-in)
- HTTP client (for blacklist DNSBL queries)
- LLM for the rationale + recommended-record generation
- Optional: scheduled-task runner for recurring audits

## Trigger Phrases

- "Audit deliverability for {domain}"
- "Run MX/SPF/DKIM/DMARC check on {domain}"
- "Pre-launch deliverability audit"
- "Why are our emails landing in spam?"
