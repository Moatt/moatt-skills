---
name: content-asset-creator
description: >
  Spin up polished, on-brand HTML assets — industry reports, landing pages, side-by-side
  comparisons, one-pagers — from structured input. Prefers the Gamma API, falls back to
  v0.dev's Platform API, and ultimately to a self-hosted Tailwind template. Produces
  self-contained HTML files that can be hosted or printed to PDF.
---

# Content Asset Creator

Produce on-brand HTML assets (reports, landing pages, one-pagers) from structured input. Built for spinning up lead magnets, industry reports, and marketing collateral programmatically.

## Quick Start

```
Create a 2-page industry report for Juicebox about "The State of AI Recruiting in 2026".
Use these data points: [list stats]. Brand: Juicebox blue, clean modern design.
```

## Inputs

- **Asset type** (required) — one of `report`, `landing-page`, `comparison`, `one-pager`
- **Content data** (required) — structured input (title, sections, stats, narrative)
- **Brand config** (optional) — colors, fonts, logo URL. Falls back to the Juicebox defaults.
- **Output** — HTML file path (default: `output/[asset-type]-[date].html`)

## Asset Types

### 1. Industry Report (2-3 pages)

A data-led artifact with stats, narrative sections, and lightweight visualizations.

**Input structure:**
```yaml
type: report
title: "The State of AI Recruiting — 2026"
subtitle: "Data-driven insights on how AI is transforming talent acquisition"
brand:
  name: "Juicebox"
  primary_color: "#4F46E5"  # Indigo/blue
  secondary_color: "#10B981"  # Green accent
  font: "Inter"
  logo_url: "https://juicebox.ai/logo.svg"
sections:
  - type: hero-stat
    stat: "93%"
    label: "of recruiters plan to increase AI use in 2026"
    source: "LinkedIn Talent Solutions"
  - type: narrative
    title: "The AI Recruiting Revolution"
    body: "AI adoption in recruiting jumped from 26% to 43% in just two years..."
  - type: stat-grid
    stats:
      - { value: "800M+", label: "Profiles searchable by AI" }
      - { value: "47%", label: "Reduction in time-to-fill" }
      - { value: "10x", label: "Cheaper than LinkedIn Recruiter" }
  - type: comparison-table
    headers: ["Feature", "Traditional", "AI-Powered"]
    rows:
      - ["Search method", "Boolean keywords", "Natural language"]
      - ["Data sources", "1 (LinkedIn)", "60+ sources"]
  - type: cta
    headline: "See AI recruiting in action"
    body: "Try PeopleGPT free — search 800M+ profiles in natural language"
    button_text: "Get Started Free"
    button_url: "https://juicebox.ai"
footer:
  text: "© 2026 Juicebox. Data sources cited throughout."
```

### 2. Landing Page (single page with CTA)

One-page marketing asset — headline, value props, and email capture.

### 3. Comparison Page (side-by-side)

A visual face-off between two products (e.g., Juicebox vs LinkedIn Recruiter).

### 4. One-Pager (quick reference)

A dense single-pager (e.g., a "PeopleGPT Prompt Library").

## Step-by-Step Process

### Step 1: Choose Generation Method

Check what's available, in priority order:

1. **Gamma API** (preferred) — If `GAMMA_API_KEY` is set, use Gamma Generate API v1.0 (GA since Nov 2025). Needs a Pro account ($16/mo). Generates decks, documents, and web pages programmatically. Supports 60+ languages, accepts up to 100K tokens of input. Rate limit: hundreds of generations per hour.
2. **v0.dev Platform API** — If `V0_API_KEY` is set, use Vercel's v0 Platform API (beta). Needs Premium ($20/mo) or Team. Emits React + Tailwind from prompts. Strong for landing pages and interactive web content.
3. **Self-hosted HTML** — Fallback. Build HTML directly from Tailwind templates. Zero external dependency. Full output control.

### Step 2A: Gamma API Generation (Preferred)

Gamma's Generate API v1.0 emits presentations, documents, and web pages from text prompts.

**API docs:** https://developers.gamma.app/docs/getting-started

```bash
curl -X POST https://api.gamma.app/v1/generate \
  -H "Authorization: Bearer $GAMMA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "<structured content prompt>",
    "format": "document",
    "theme": "<optional theme ID>"
  }'
```

**Tips for Gamma:**
- List available themes first via `GET /v1/themes`
- Can share via email programmatically
- Template-driven generation: hit `POST /v1/generate-from-template`
- Output renders as a hosted Gamma page or can be exported

### Step 2B: v0.dev Platform API Generation

v0's Platform API generates React + Tailwind from natural-language prompts.

**API docs:** https://v0.app/docs/api/platform/overview

The flow: prompt → project → code files → deployment. Output is one click from Vercel.

```bash
# Create a project from a prompt
curl -X POST https://api.v0.dev/v1/projects \
  -H "Authorization: Bearer $V0_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a professional industry report page with..."
  }'
```

**Tips for v0:**
- Best for interactive pages and landing pages
- Output is React/Next.js + Tailwind — can be deployed directly or exported to static HTML
- Usage-based billing layered on top of the subscription

### Step 2C: Self-Hosted HTML Generation (Fallback)

Emit a fully self-contained HTML file:

1. **Load the template** for the chosen asset type
2. **Inject content** from the structured data
3. **Apply brand styles** (colors, fonts, logo)
4. **Draw the visualizations** via inline SVG or CSS
5. **Write** a single HTML file with all styles inlined

**HTML Template Structure:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ title }}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: '{{ primary_color }}',
            accent: '{{ secondary_color }}'
          },
          fontFamily: {
            sans: ['Inter', 'sans-serif']
          }
        }
      }
    }
  </script>
  <style>
    /* Print rules for PDF conversion */
    @media print {
      .page-break { page-break-before: always; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body class="font-sans bg-white text-gray-900">
  <!-- Content sections rendered here -->
</body>
</html>
```

**Section Templates:**

- `hero-stat`: Large stat number with label and source
- `narrative`: Title + body text in clean typography
- `stat-grid`: 3-4 stats in a responsive grid
- `comparison-table`: Side-by-side table with highlighting
- `chart`: Lightweight bar/donut chart via CSS or inline SVG
- `cta`: Call-to-action block with a button
- `footer`: Branded footer with disclaimers

### Step 3: Output

Save the HTML to:
```
clients/<client>/strategies/<strategy>/content/[asset-name].html
```

Optionally turn it into a PDF:
```bash
# Via playwright/puppeteer if installed
npx playwright screenshot output.html output.pdf --format=pdf
```

Or hand the user instructions for manual PDF conversion (print-to-PDF in a browser).

## Brand Configurations

### Juicebox Brand
```json
{
  "name": "Juicebox",
  "primary_color": "#4F46E5",
  "secondary_color": "#10B981",
  "accent_color": "#F59E0B",
  "background": "#FFFFFF",
  "text_color": "#111827",
  "font_heading": "Inter",
  "font_body": "Inter",
  "logo_url": "https://juicebox.ai/logo.svg"
}
```

Brand configs live at: `skills/content-asset-creator/brands/[client].json`

## Tips

- Cap reports at 2-3 pages. Busy recruiters won't read more.
- Lead with the biggest, most surprising stat. Make it impossible to scroll past.
- Each section should land exactly ONE key takeaway. Don't dilute by stacking messages.
- The CTA should feel inevitable, not glued on. The data should usher the reader toward the conclusion that they need your product.
- For PDF distribution: confirm the HTML prints cleanly before sending. Lean on `@media print` styles.
- For web distribution: include Open Graph meta tags so the link previews well on LinkedIn or X.

## Dependencies

- Tailwind CSS (via CDN — no build step)
- Google Fonts (via CDN)
- Optional: Gamma API key (`GAMMA_API_KEY`) — Gamma Pro account required ($16/mo). API v1.0 GA. Docs: https://developers.gamma.app
- Optional: v0.dev API key (`V0_API_KEY`) — v0 Premium required ($20/mo). Platform API (beta). Docs: https://v0.app/docs/api/platform/overview
- Optional: Playwright/Puppeteer for PDF conversion

## Templates

Templates ship at `skills/content-asset-creator/templates/`:
- `report.html` — Industry report template
- `landing-page.html` — Landing page with email capture
- `comparison.html` — Product comparison page
- `one-pager.html` — Quick reference sheet

Each consumes the content data structure described above.
