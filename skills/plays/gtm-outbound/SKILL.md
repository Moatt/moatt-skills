---
name: gtm-outbound
description: >
  Find, enrich, and sequence B2B leads through Moatt's native in-chat tools —
  results stream into a live leads table panel (Find / Enrich / Sequence /
  Pricing tabs). Use for any "find leads / build a lead list / prospect /
  source companies / enrich contacts / sequence outreach / LinkedIn
  prospecting" request. This is the GTM operating layer: it does NOT run box
  scripts or curl — it calls the chat's native tools directly.
---

# GTM Outbound — find, enrich, sequence leads

This skill does NOT use `boxExec`, curl, or any `scripts/` file. It routes to the
chat's **native tools**, which render results into the leads table panel beside
the chat. Call the tool directly — do not look for a Python recipe.

## Your native tools (already available in this chat)

- **`findLeads({ query, icpContext?, title?, filters?, limit? })`** — Find
  companies/leads matching a natural-language query. Auto-discovers the best
  data source (Apollo / Hunter / PeopleDataLabs / … via the Orthogonal catalog),
  runs it, and streams the results into the **Find** tab of the leads panel with
  fit scores, funding, headcount, and buying signals. **Always pass `icpContext`**
  (see Step 0) — it grounds the filter in the company's real target industry/size
  so the search returns rows instead of zero.
- **`enrichContacts({ contacts:[{name, company, domain?}], title? })`** — Add
  verified email + phone + LinkedIn to a list of contacts (FullEnrich). Updates
  the **Enrich** tab.
- **`sequenceLeads({ contacts:[{name, company}], channel, firstStep? })`** —
  Stage contacts into a multi-touch outreach view on the **Sequence** tab.
  (Actual sending goes through the outbound campaign flow — this stages the
  plan.)
- **`findLinkedInLeads({ keywords, salesNavigator?, limit? })`** — Search
  LinkedIn (Classic or Sales Navigator) for people; renders into the panel.
  Requires a connected LinkedIn account.
- **`connectLinkedIn({ userId, message? })`** — Send a LinkedIn connection
  invitation (with optional note). External side effect — confirm first.
- **`messageLinkedIn({ userId, text, salesNavigator? })`** — Start a chat and
  send a LinkedIn DM. External side effect — confirm first.

## Workflow

0. **Ground in context FIRST.** Before any search, read the project's company +
   ICP context so your filters target the RIGHT buyers:
   - `boxRead` `/workspace/home/context/ICPs.md` and `.../ProjectContext.md`
     (or `boxSearch` for "ICP" / "ideal customer"). If those are missing,
     `karmable_kg_search` for the project's ICP / target-industry facts.
   - Extract: the TARGET industry (use the BROAD LinkedIn term it gives —
     "Software Development", "Financial Services" — never coined jargon like
     "fintech"/"saas"), company size band, geography, buyer roles, buying signals.
   - This context was generated automatically during onboarding from the
     company's domain. If it's genuinely absent, proceed with the user's query
     alone (last resort) — but prefer grounding.
1. **Find** — Call `findLeads` with the user's intent AND pass what you read in
   Step 0 as `icpContext`. For LinkedIn-specific prospecting (by title/role at
   companies), use `findLinkedInLeads` instead. The panel opens automatically.
2. **Enrich** — When the user wants emails/phones, call `enrichContacts` with
   the rows already shown.
3. **Sequence** — When the user wants outreach, call `sequenceLeads` (email) or
   the LinkedIn tools (`connectLinkedIn` / `messageLinkedIn`).
4. **Pricing** — The panel has a Pricing tab showing per-action credit costs;
   no tool call needed, just tell the user to open it.

## Spend smart — fewest calls, most data per dollar

Every find/enrich call costs real credits. Be frugal by default:
- **Start small.** `findLeads` defaults to ~25 results — DON'T request hundreds up front. Only widen (or paginate via "get more leads") when the user explicitly wants more.
- **Find is cheap; enrich is expensive.** After `findLeads`, let the user review the panel. **Enrich ONLY the rows they actually want** — pass that subset to `enrichContacts` in ONE batched call. NEVER auto-enrich every row, and never call `enrichContacts` per-row.
- **Don't re-search the same thing.** Identical queries are cached (free) for 24h — but don't fire near-duplicate searches hoping for different results.
- **One source per find.** `findLeads` already picks the cheapest capable vendor automatically and stops at the first that returns rows — don't loop it.

## Hard rules

- **Keep chat replies to one short sentence** — the panel shows the table.
- **Never fabricate leads.** If a tool returns an `error`/`message` (no source
  found, search failed, zero results, LinkedIn not connected), relay that
  message verbatim and stop. Do NOT invent companies, emails, or contacts.
- **LinkedIn needs a connected account.** If `findLinkedInLeads` /
  `connectLinkedIn` / `messageLinkedIn` returns `linkedin_not_connected`, tell
  the user to connect LinkedIn (the panel shows a Connect button) — don't retry.
- **Sends are side effects** — confirm with the user before `connectLinkedIn` /
  `messageLinkedIn`.
