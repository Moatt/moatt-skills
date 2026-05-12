---
name: help-center-article-generator
description: >
  Convert support ticket clusters, FAQ patterns, product documentation, or feature
  specs into structured help center articles complete with step-by-step instructions,
  screenshot placeholders, troubleshooting sections, and related-article links.
  Batch mode generates many articles from a ticket export. Pure reasoning skill.
tags: [content]
---

# Help Center Article Generator

Turn support tickets into self-serve answers. Takes recurring questions, feature docs, or product specs and emits help center articles that cut ticket volume.

**Built for:** Early-stage teams where the same 20 questions make up 80% of support tickets and nobody has time to write help docs. The aim: convert one afternoon of article generation into months of ticket deflection.

## When to Use

- "Spin up help center articles for our top support tickets"
- "Convert these support tickets into FAQ articles"
- "Produce docs for [feature]"
- "Flesh out our knowledge base"
- "Ticket volume is overwhelming us — help me build self-serve content"

## Phase 0: Intake

### Content Source (share any/all)
1. **Support ticket export** — CSV or list of recent tickets (subject, description, resolution). The skill clusters them to surface recurring themes.
2. **FAQ list** — If you already have the top questions, hand them over directly.
3. **Feature documentation** — Internal docs, PRDs, or specs covering features that need customer-facing articles.
4. **Product walkthrough** — Walk through the workflow and the skill drafts the article from your steps.
5. **Existing articles to improve** — URLs or text for current help articles that need a rewrite.

### Configuration
6. **Product name** — What's the product's name?
7. **Audience** — Who's reading these? (Technical, non-technical, mixed)
8. **Tone** — Casual/friendly, professional, or technical/developer-docs?
9. **Article structure preference:**
   - **Standard** — Overview → Steps → Troubleshooting → Related
   - **Developer** — Overview → API reference → Code examples → Errors
   - **Quick start** — What → Why → How (3 steps max) → Next
10. **Screenshot convention** — Do you rely on screenshots? (The skill leaves `[Screenshot: description]` placeholders.)
11. **Batch or single?** — One article, or a batch generated from a ticket export?

## Phase 1: Topic Clustering (Batch Mode)

If a ticket export is supplied, group the tickets into article topics:

### Clustering Approach

1. **Cluster by similarity** — Group tickets with overlapping subject/description
2. **Rank by frequency** — The largest clusters become the top-priority articles
3. **Tag each cluster with an article type:**

| Type | When to Use | Example |
|------|-------------|---------|
| **How-to** | "How do I do X?" | "How to set up email integration" |
| **Troubleshooting** | "X isn't working" | "Fix: emails not sending" |
| **Concept/Overview** | "What is X?" | "Understanding billing plans" |
| **Reference** | "What are the options for X?" | "API rate limits and quotas" |
| **Getting Started** | First-time setup | "Quick start: your first campaign" |

### Cluster Output

```
TOPIC CLUSTERS (ranked by ticket frequency):

1. [Topic] — [N tickets] — Type: [How-to]
   Common phrasing: "[How customers ask this question]"
   Resolution pattern: [What support typically tells them]

2. [Topic] — [N tickets] — Type: [Troubleshooting]
   ...

3. ...
```

## Phase 2: Article Generation

### Article Template — How-to

```markdown
# [Action-oriented title — e.g., "How to Set Up Email Integration"]

[1-2 sentence overview: What this article covers and who it's for]

**Time to complete:** [X minutes]
**Prerequisites:** [What they need before starting — e.g., "Admin access, API key"]

---

## Step 1: [Action verb + what to do]

[1-2 sentences explaining this step]

[Screenshot: Description of what the user should see — e.g., "Settings page with Integrations tab highlighted"]

> **Tip:** [Helpful context or shortcut]

## Step 2: [Action verb + what to do]

[Instructions]

[Screenshot: Description]

## Step 3: [Action verb + what to do]

[Instructions]

---

## Verify It Worked

[How to confirm the setup was successful]

[Screenshot: Description of success state]

---

## Troubleshooting

### [Common problem 1]
**Symptom:** [What the user sees]
**Cause:** [Why this happens]
**Fix:** [Step-by-step resolution]

### [Common problem 2]
**Symptom:** [...]
**Cause:** [...]
**Fix:** [...]

---

## FAQ

**Q: [Common follow-up question]**
A: [Answer]

**Q: [Another common question]**
A: [Answer]

---

## Related Articles

- [[Article title]] — [1-line description of when to read it]
- [[Article title]] — [...]
```

### Article Template — Troubleshooting

```markdown
# Fix: [Problem description — e.g., "Emails Not Sending"]

[1-2 sentences: When you'd hit this problem]

---

## Quick Fix

Try this first (resolves ~80% of cases):

1. [Most common fix — step 1]
2. [Step 2]
3. [Verify]

---

## If That Didn't Work

### Check 1: [First thing to verify]
[How to check + what to look for]

✅ If [expected result] → This isn't the issue. Move to Check 2.
❌ If [unexpected result] → [Specific fix for this case]

### Check 2: [Second thing to verify]
[How to check]

✅ If OK → Move to Check 3.
❌ If not → [Fix]

### Check 3: [Third thing to verify]
[How to check]

✅ If OK → Move to "Still Not Working?"
❌ If not → [Fix]

---

## Still Not Working?

If none of the above resolved your issue:

1. [What information to gather — e.g., "Screenshot of the error message"]
2. [Where to get help — e.g., "Email support@company.com with the above info"]
3. [Expected response time]

---

## Why This Happens

[2-3 sentences explaining the root cause for curious users. Optional but builds trust.]

## Related Articles

- [[Article]] — [Context]
```

### Article Template — Getting Started / Quick Start

```markdown
# Getting Started with [Feature/Product]

[1-sentence: What you'll accomplish by the end of this guide]

**Time:** [X minutes] | **Difficulty:** [Beginner/Intermediate]

---

## What You'll Need

- [Prerequisite 1]
- [Prerequisite 2]

---

## Step 1: [First thing to do] (2 min)

[Clear instructions]

[Screenshot: Description]

## Step 2: [Second thing] (3 min)

[Instructions]

## Step 3: [Third thing] (2 min)

[Instructions]

---

## You're All Set! 🎉

[What they can now do]

**Next steps:**
- [Logical next action — link to next article]
- [Power user tip — link to advanced article]
- [Join community — link if applicable]
```

## Phase 3: Article Quality Check

Verify the following on every article produced:

- [ ] **Action-oriented title** — Begins with "How to", "Fix:", "Getting Started", or "Understanding"
- [ ] **Scannable layout** — Uses headers, numbered steps, and bold key terms. No paragraphs that feel like walls.
- [ ] **End-to-end coverage** — Walks through the full workflow, not just the happy path
- [ ] **Troubleshooting present** — Covers a minimum of 2 common failure modes
- [ ] **No jargon** — Speaks in customer language, not internal lingo
- [ ] **Screenshot placeholders** — Any UI-touching step gets a placeholder
- [ ] **Related-article links** — Cross-links keep users inside the help center
- [ ] **Search-friendly** — Title and opening paragraph carry the keywords customers actually search for

## Phase 4: Output

### Single Article Mode
Drop the file into the current working directory as `[article-slug].md`.

### Batch Mode
Place every article inside a `help-center/` subdirectory in the current working directory, with an `_index.md` table of contents alongside.

### Index Template

```markdown
# Help Center — [Product Name]
Generated: [DATE] | Articles: [N]

## Getting Started
- [[getting-started-guide.md]] — First-time setup walkthrough
- [[quick-start.md]] — 5-minute quick start

## How-To Guides
- [[how-to-setup-email.md]] — Set up email integration
- [[how-to-invite-team.md]] — Invite team members
- ...

## Troubleshooting
- [[fix-emails-not-sending.md]] — Emails not sending
- [[fix-login-issues.md]] — Can't log in
- ...

## Reference
- [[api-rate-limits.md]] — API limits and quotas
- [[billing-plans.md]] — Plan comparison and billing FAQ
```

## Cost

| Component | Cost |
|-----------|------|
| Article generation across the board | Free (LLM reasoning) |
| **Total** | **Free** |

## Tools Required

None required. Pure reasoning skill — takes raw input, returns structured articles.

## Trigger Phrases

- "Draft help center articles from our support tickets"
- "Produce docs for [feature]"
- "Flesh out our knowledge base"
- "Convert our FAQs into help articles"
- "Spin up the help center article generator"
