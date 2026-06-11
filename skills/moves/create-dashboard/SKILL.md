---
name: create-dashboard
description: >
  Build a custom web dashboard (React + Vite + Express) inside the sandbox that visualizes
  the agent's Turso database. The dashboard runs on port 3847 and the user sees it live in
  the "App" tab inside Moatt. Use this whenever the user asks for a dashboard, visualization,
  chart, metric view, or any bespoke UI powered by their agent's data.
tags: [content, design]
---

> **⚠️ Legacy-platform skill — check before using.** This recipe requires the
> pre-provisioned dashboard template at `/home/user/dashboard`, the in-app
> "App" tab, and the agent Turso database. On the current Upstash Box platform
> NONE of those exist — `/home/user/dashboard` is absent and there is no App
> tab to view port 3847. If `ls /home/user/dashboard/package.json` says
> MISSING, STOP immediately (don't go probing the filesystem for it): deliver
> the dashboard as an in-app report/dashboard artifact plus exported
> CSV/JSON files in the project workspace instead.

This skill helps the user spin up a custom dashboard built off the Moatt dashboard template.
The app needs to run on port 3847 from a single Express process — that one process must serve
both the API routes and the built React UI so it shows up in the Moatt App tab.

## Where the source lives (read this first)

The **runnable project folder is `/home/user/dashboard`**. That's the
ONLY directory you should `cd` into for any npm / build / server
command. Most files inside it are symlinks pointing back into the
canonical source under the agent's workspace folder (the file you'd
see at the canonical path is the same file you'd see through the
symlink — one file, two paths). The runnable project folder also
contains two real local directories that must NOT live on the workspace
mount: `node_modules` (dependencies) and `dist` (built bundle).

```
/home/user/dashboard/                    ← cd here for everything
  package.json, package-lock.json,
  server.js, src/, vite.config.ts, …    (symlinks → workspace canonical source)
  node_modules/, dist/, .vite/, .cache/  (real local dirs — never on workspace)
```

What that means for you in practice:

- **Always `cd /home/user/dashboard` before invoking npm / vite / node /
  any shell command.** Tools resolve modules from the `node_modules`
  beside the cwd. If you run them from the canonical workspace source
  path, `node_modules` gets installed directly onto the workspace mount —
  that drops tens of thousands of files onto s3fs, blows past its
  filesystem-semantics limits (npm errors with `ENOTEMPTY` on package
  renames), and the install spins forever.
- **Edits to source files under `/home/user/dashboard/src/...` (or any
  other symlinked path) auto-persist** to the workspace mount through
  the symlink. There's no separate sync step. Editing at the canonical
  path works just as well; both paths point at the same file.
- **Never run `npm install`, `npm ci`, `vite build`, or `node server.js`
  from inside the workspace canonical source folder.** Doing so litters
  the workspace with `node_modules` / `dist` / build caches and breaks
  future restores.

## Non-negotiable constraints

1. Always use the template workflow (React + Vite + Tailwind + Express). Don't rebuild it on another framework.
2. The runnable project folder is `/home/user/dashboard`. Use that literal path when telling the user where you cd'd or which file you edited; don't invent shell-variable strings.
3. Always `cd /home/user/dashboard` before invoking npm / vite / node. Edits to symlinked source files inside it propagate to persistent storage automatically — no separate sync step.
4. `node_modules` and `dist` are LOCAL only. Never copy them onto the workspace folder.
5. One runtime port (3847), one server process. No separate frontend dev server.

## State handling

Before editing anything, inspect:
- whether the runnable project folder's `package.json` is a symlink (it should be — that confirms the symlink layout is in place)
- whether the local `node_modules` folder inside the runnable project folder has content
- whether port 3847 has a healthy server

Then route accordingly:
- All three good: proceed with customization.
- Symlinks missing or `node_modules` empty: ask the platform to re-run the start flow (it sets up symlinks + npm install + build + launch).
- `package.json` is a real file (not a symlink): the sandbox is in a legacy state — ask the platform to re-run install/start so the symlink layout gets put back in place.

The platform's start/install orchestrator owns symlink setup, dependency
install, build, and launch. You don't run those steps manually unless
something is broken.

## Discovery and planning

Before writing code:
1. Clarify the user's visualization goal if it's unclear.
2. **Always check the agent's database first.** When the agent has a Turso database with relevant tables, the dashboard MUST read from it. Don't invent placeholder rows, mock arrays, or hard-coded sample data when real data exists. Mock data is only acceptable when the user explicitly asks for a demo with no DB — and even then, clearly mark it as mock in the UI.
3. Inspect the database schema with the database query tool:
   - list tables
   - inspect columns on the relevant tables
   - run a small sample query to confirm shape and row counts before wiring a chart
   - if the relevant tables are missing, follow the **Empty-database handling** section below — propose a schema and create the tables rather than defaulting to mock data
4. If the request is vague, confirm a one-sentence implementation plan first.

## Data source preference

The order of preference for every panel, chart, and table is:
1. Live query against the agent's database via the runQuery helper or a read-only API route.
2. A user-provided file (CSV, JSON) already sitting in the workspace.
3. Mock data — last resort only, with explicit permission, and clearly labelled as such on screen.

## Empty-database handling (important)

Most users won't be technical and won't know how to set up a schema on their own. **Don't fall back to "sample data" the moment a table is missing.** Instead, when the DB is reachable but the needed tables don't exist:

1. Confirm which tables do exist by listing them via the database tool.
2. Plainly tell the user that the table(s) the dashboard needs aren't there yet, and propose a small, sensible schema for what they asked for (e.g., for a "revenue dashboard": a `deals` table with `id`, `name`, `amount`, `stage`, `closed_at`, plus a `revenue_daily` rollup if useful). Keep the schema lean — only the columns the requested charts actually need.
3. Get a one-line confirmation from the user, then create the tables via the database tool. Use sensible types and primary keys. Add helpful indexes for any column the dashboard will filter or group on.
4. Offer to seed a small set of realistic example rows so the charts have something to render straight away. Seed only with permission, and tell the user clearly that these rows are starter examples they can delete or replace.
5. Wire the dashboard to the newly created tables. Do **not** also keep a mock-data fallback in the code — once the table exists, the empty state in the UI is sufficient.

If the user declines schema creation, render a calm empty state ("no data yet — connect a table named X with columns A, B, C to see this chart") in stone tones, not fake numbers.

Never create or alter tables that already hold user data without explicit instruction. Never drop tables. All table creation must be additive.

## Implementation guidance

Template structure to use:
- A server entry module for API routes and static serving.
- The root App component for route registration.
- A **layouts folder** under src/components/layouts/ holding six shell components — pick the one that fits what the user is building (see "Choosing a layout" below).
- A pages folder for page implementations.
- A small API helper module exporting a runQuery function for data access from pages.

For each new page:
1. Add a page component to the pages folder.
2. Fetch data through the runQuery helper, or via a dedicated read-only API route when SQL gets complex.
3. Add route wiring in the root App component.
4. Add a navigation entry in whichever layout shell the App component is wrapped in (sidebar nav, top nav, or tab bar — depending on the chosen layout).

Keep every dashboard endpoint read-only.

### Choosing a layout

There are six layout shells in `src/components/layouts/`. The default `App.tsx`
wraps routes in `SidebarLayout`. Swap the import + wrapper in `App.tsx` to
the shell that fits what the user wants:

| Shell | Use when the user asks for… |
| --- | --- |
| `SidebarLayout` (default) | a multi-section app with several pages (analytics, admin, multi-page tool) |
| `TopNavLayout` | a single-purpose dashboard, marketing-style report, or anything that wants full-width content |
| `TopNavTabsLayout` | a Stripe-Dashboard-style sectioned view where tabs slice the same workspace |
| `SplitPaneLayout` | inbox / CRM / chat / mail-style apps — list on the left, detail on the right. Pass `list` and `detail` as separate props |
| `CanvasLayout` | a one-page report, embed, or screen with no chrome at all |
| `CenteredLayout` | login forms, onboarding screens, single-action surfaces |

Rules:
- **Pick exactly one** shell per dashboard. Don't mix two shells in App.tsx.
- Before swapping the shell, confirm the choice with the user in one sentence ("I'll build this as a split-pane inbox — list on the left, message on the right. OK?").
- After swapping the shell, edit the nav entries inside that shell file to match the routes you wire up.
- All shells share the same stone palette, typography, and spacing — don't introduce new colors or fonts when switching shells.
- `SplitPaneLayout` takes `list` + `detail` props in place of `children`. App.tsx should render the list pane (route-agnostic) and the detail pane (typically a `<Routes>`) as those two props.

## Visual style rules

Design inspiration: aim for the calm, content-first feel of Linear, Vercel, Stripe, and Notion analytics dashboards. The dashboard should read like a quiet reporting surface, not a colourful BI tool. Density is welcome; chart-junk isn't.

Concrete rules:
- Use the stone color palette only — stone-tinted text, borders, and backgrounds. No blues, greens, purples, or rainbow palettes.
- Lean on compact typography (extra-small or small text sizes) with normal font weight. Avoid bold headlines except for the page title.
- Keep borders minimal (single hairline in a light stone tone) and steer clear of heavy shadows or rounded "card" stacks. Flat surfaces only.
- For Recharts lines, bars, and grids, stick to the stone color family. Use opacity to differentiate series rather than hue. Single-series charts should be a single mid-stone tone.
- Layout: pick a shell from `src/components/layouts/` (see "Choosing a layout" above) instead of inventing new chrome. Within whichever shell you pick, keep the main content column generous on whitespace, KPIs as a row of small stat blocks at the top, charts and tables stacked below.
- Empty states, loading states, and error states must follow the same stone palette and typography — no spinners in brand colours, no red error toasts.

When in doubt, look at the existing pages in the template and match their density, spacing, and tone before adding anything new.

## Build, run, and verify

The dashboard does **not** hot-reload on file changes. After editing
source files under `/home/user/dashboard/src/...`, run `npm run build`
from `/home/user/dashboard`. You do **not** need to restart the server
for `src/` edits — the running Express server uses
`express.static(dist/public)` and reads files from disk on every
request, so the next iframe refresh picks up the freshly-built bundle
automatically (Vite emits new hashed asset filenames; the new
`index.html` points at them).

Default flow after a `src/` edit:
1. Run `npm run build` from `/home/user/dashboard`.
2. Tell the user the update is live and to refresh the App tab. Done.

**Don't stop, kill, or restart the dashboard server as part of the
normal edit loop.** Doing so wastes time and creates a failure mode:
the agent backgrounds `node server.js`, then polls the background task
waiting for it to "complete" — but a healthy server is a long-lived
process, so the poll loop never resolves and the chat appears frozen.

### When a restart IS warranted

Only restart the server when one of these holds:

- You edited `server.js` itself (new API route, new middleware, anything
  that changes server behavior — Express won't pick those up without a
  process restart).
- The server isn't running on 3847. The platform's start flow is the
  right tool for that — ask it to start; don't hand-roll a launch.
- The user reports a visible dashboard problem (blank App tab, stale UI
  even after refresh, an error they can see) and a restart is a
  plausible fix. In that case: stop the old process using the
  port-scoped cleanup pattern (never broad pkill inside the sandbox),
  launch the new one, then verify health via the `/api/health` endpoint.

If you do launch `node server.js` yourself, fire-and-forget it
(redirect output to a log file, return immediately) and verify via
the `/api/health` endpoint. Never poll a background-task output waiting
for the server process to exit — it won't.

### Verifying after work that warranted a restart

Hit the health endpoint:
- ok=true with db=true: dashboard is live.
- db=false: tell the user the agent DB credentials/config are missing and stop further DB-dependent work.

## Troubleshooting

When the user reports a problem with the dashboard, walk through this list in order before changing code. Most "the dashboard is broken" reports are environmental, not bugs in the user's pages.

1. **App tab is blank or shows a connection error.** Check whether the server is actually running on port 3847 (hit `/api/health`). If not, ask the platform to re-run the start flow.
2. **Health endpoint returns ok=false or db=false.** The agent's database credentials are missing or invalid. Tell the user directly; don't silently swap in mock data.
3. **Page renders but charts/tables are empty.** Run the underlying query through the database tool to confirm whether the table has rows. If the table is entirely missing, follow the Empty-database handling section — offer to create the schema; don't silently swap to mock data. If the table exists but is empty, render an empty state. If rows exist, double-check the runQuery call and column names.
4. **"Module not found" or import errors after editing.** A new package got used without being added to `package.json`. Add it. Then change directory into `/home/user/dashboard`. Then run `npm install`. Then rebuild. **Never run `npm install` from anywhere under the workspace folder** — that drops `node_modules` onto the workspace mount, which hits the s3fs filesystem-semantics limits and spins forever.
5. **Changes don't appear in the App tab.** The build wasn't run after the edit, or the user hasn't refreshed yet. Run `npm run build` from `/home/user/dashboard` and ask the user to refresh — Express serves the new bundle off disk, so no server restart is needed for `src/` edits. Restart the server only if a refresh still shows stale output.
6. **Stale UI after a long session.** The build output drifted from source. Remove the `dist` folder inside the runnable project folder and rebuild.
7. **The runnable project folder's `package.json` is a real file (not a symlink).** The sandbox is in a legacy / pre-symlink state. Ask the platform to re-run the start flow — it'll rewire the symlinks and rebuild.
8. **Sandbox restarted and the dashboard isn't running.** Just ask the platform to start it. The source persists in S3 via symlinks, so there's nothing for you to restore.

If none of that resolves it, read the server logs, summarize the actual error to the user in plain language, and propose the smallest fix.

## Completion message

Wrap up with a direct status message that the dashboard is live in the App tab and ready
for further edits.

## Iteration loop

For every follow-up tweak (this loop is the agent's job, not the user's):
1. Edit relevant files under `/home/user/dashboard/...`. Symlinks persist edits to the workspace automatically; no sync step.
2. Run `npm run build` from `/home/user/dashboard`. Don't restart the server — Express picks up the new `dist/` automatically on the next request.
3. Tell the user the update is done and ask them to refresh the App tab.

Restart the server only in the cases listed under "When a restart IS warranted" above (`server.js` changed, server not running, or the user reports a visible problem).
