---
name: create-html-carousel
description: Produce LinkedIn carousel posts as crisp PNG images. Lay out informational multi-slide posts (think "5 AI GTM workflows") with a unified visual system, then auto-screenshot each slide at LinkedIn's recommended 1080x1080px size.
---

> **Deprecated:** This skill has been replaced by `moatt-graphics`. See `skills/composites/moatt-graphics/` (install via `npx moatt install moatt-graphics`). The carousel layout is just one of seven formats in the newer skill, which also supports 36 style presets, image sourcing, and PNG export. This file remains for one release cycle before retirement.

# LinkedIn Carousel Creator

Build polished LinkedIn carousel posts as PNG images. The skill emits styled HTML slides built for the square 1080×1080px format, then auto-captures each slide as a PNG you can upload straight to LinkedIn.

## Core Philosophy

1. **LinkedIn-First Design** — Square layout (1080×1080px), tuned for mobile feed reading
2. **Informational Content** — Tips, workflows, lists, frameworks — not slide decks
3. **Consistent Styling** — Reuses battle-tested design systems from frontend-slides
4. **Automated Export** — HTML → Screenshot → PNG files ready for LinkedIn upload
5. **Viewport Perfect** — Each slide must fit exactly inside 1080×1080px with no scrolling

---

## LinkedIn Carousel Specs

**Format:** Square (1080×1080px)

- **Aspect ratio:** 1:1
- **File format:** PNG (preferred) or JPG
- **File size:** Under 10MB per image
- **Max slides:** 10 images per carousel
- **Ideal slide count:** 5-8 slides (best engagement)

**Content Structure:**

1. **Cover slide** — Hook + title + brand
2. **Content slides** — One key idea per slide (3-6 slides)
3. **Closing slide** — CTA / wrap-up / follow prompt

---

## When to Use This Skill

Reach for it when building LinkedIn carousels like:

- "5 AI GTM workflows you should be using"
- "How to build X: A step-by-step guide"
- "7 mistakes founders make with Y"
- "The complete framework for Z"
- "Before & After: How we 10x'd our metrics"

**Not for:**

- Long-form decks (use frontend-slides)
- Video content
- Single-image posts

---

## Workflow Overview

```
1. Content Input → User provides topic/outline
2. Style Selection → Choose visual style (or preview options)
3. HTML Generation → Create 1080×1080px HTML slides
4. Screenshot → Auto-capture each slide as PNG
5. Delivery → Folder of PNG files ready for LinkedIn upload
```

---

## Phase 1: Content Discovery

### Step 1.1: Get Topic & Structure

Prompt the user:

**Question 1: What's the topic?**

- Header: "Topic"
- Question: "What's the main topic of this carousel?"
- (Free text input)

**Question 2: Content Type**

- Header: "Format"
- Question: "What type of post is this?"
- Options:
  - "Numbered list" — "5 ways to...", "7 mistakes...", "3 steps to..."
  - "How-to guide" — Step-by-step tutorial or process
  - "Framework" — Concept explanation with structure
  - "Before/After" — Transformation or case study
  - "Insights/Tips" — Collection of advice or learnings

**Question 3: Slide Count**

- Header: "Length"
- Question: "How many slides?"
- Options:
  - "Short (5-6)" — Snappy, mobile-friendly
  - "Medium (7-8)" — Standard carousel length
  - "Long (9-10)" — LinkedIn's hard cap

**Question 4: Branding Handle**

- Header: "Brand"
- Question: "What handle or name should appear on each slide?"
- (Free text — e.g., "@yourhandle", "Acme Inc", or leave blank for none)

**Question 5: Content Ready?**

- Header: "Content"
- Question: "Do you have the content written?"
- Options:
  - "Yes, I have all content" — Paste it in
  - "I have bullet points" — Need light formatting
  - "Just the topic" — Need help outlining

If the user has content prepared, ask for it.

### Content Density Rules for LinkedIn

Each slide should be **digestible in 2-3 seconds** on mobile:

| Slide Type | Max Content                                              |
| ---------- | -------------------------------------------------------- |
| Cover      | Title (1 line) + subtitle (1 line) + branding            |
| List item  | Number/icon + heading (2 lines max) + body (3 lines max) |
| Framework  | Diagram/visual + 2-4 labels                              |
| Quote/Stat | 1 large stat or quote + context                          |
| CTA        | 1 action + visual element                                |

**Over the limit?** Split across multiple slides or trim the content.

---

## Phase 2: Style Selection

Users can pick a style in two ways:

### Option A: Direct Selection (Faster)

Surface the preset picker:

**Question: Pick a Style**

- Header: "Style"
- Question: "Which visual style works best for your content?"
- Options:
  - "Bold Signal" — High-contrast card on a dark backdrop, confident
  - "Dark Botanical" — Elegant dark canvas with soft organic shapes
  - "Notebook Tabs" — Editorial cream paper with colourful tabs
  - "Pastel Geometry" — Approachable pastels with decorative pills
  - "Neon Cyber" — Futuristic tech aesthetic
  - "Split Pastel" — Playful two-tone split design

(Check STYLE_PRESETS.md for the full breakdown of each style)

### Option B: Guided Discovery

If the user is unsure, ask:

**Question: Audience & Tone**

- Header: "Vibe"
- Question: "Who's your audience and what tone?"
- Options:
  - "Professional/Corporate" → Recommend: Bold Signal, Dark Botanical
  - "Creative/Playful" → Recommend: Split Pastel, Pastel Geometry
  - "Technical/Dev-focused" → Recommend: Neon Cyber, Terminal Green
  - "Elegant/Premium" → Recommend: Dark Botanical, Paper & Ink

Then render 2-3 preview slides and let the user choose.

---

## Phase 3: Generate HTML Carousel

### File Structure

Every carousel artifact (HTML source plus PNG exports) lands in the shared assets directory.

```
[carousel-name]/
├── index.html              # Full carousel (all slides)
├── slides/
│   ├── slide-01.html       # Individual slide pages
│   ├── slide-02.html
│   └── ...
└── exports/
    ├── slide-01.png        # Screenshots (created in Phase 4)
    ├── slide-02.png
    └── ...
```

### HTML Architecture for 1080×1080px

**CRITICAL: LinkedIn carousel slides are SQUARE (1:1 ratio), not widescreen.**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Slide 01</title>

    <!-- Fonts -->
    <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=..." />

    <style>
      /* ===========================================
           LINKEDIN CAROUSEL: SQUARE FORMAT
           Fixed 1080×1080px for screenshot
           =========================================== */
      :root {
        /* Fixed size for LinkedIn */
        --slide-width: 1080px;
        --slide-height: 1080px;

        /* Colours (from chosen preset) */
        --bg-primary: #0a0f1c;
        --text-primary: #ffffff;
        --accent: #00ffcc;

        /* Typography - scaled for square format */
        --title-size: 72px;
        --subtitle-size: 36px;
        --body-size: 28px;
        --small-size: 20px;

        /* Spacing */
        --slide-padding: 80px;
        --content-gap: 40px;

        /* Animation */
        --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
      }

      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      html,
      body {
        width: var(--slide-width);
        height: var(--slide-height);
        overflow: hidden;
      }

      body {
        font-family: var(--font-body);
        background: var(--bg-primary);
        color: var(--text-primary);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: var(--slide-padding);
      }

      /* Content container */
      .slide-content {
        width: 100%;
        max-width: 100%;
        display: flex;
        flex-direction: column;
        gap: var(--content-gap);
      }

      /* Typography hierarchy */
      h1 {
        font-size: var(--title-size);
        font-weight: 800;
        line-height: 1.1;
        margin-bottom: 20px;
      }

      h2 {
        font-size: var(--subtitle-size);
        font-weight: 700;
        line-height: 1.2;
      }

      p,
      li {
        font-size: var(--body-size);
        line-height: 1.4;
      }

      /* List styling */
      ul {
        list-style: none;
      }

      li {
        padding-left: 40px;
        position: relative;
        margin-bottom: 20px;
      }

      li::before {
        content: "→";
        position: absolute;
        left: 0;
        color: var(--accent);
        font-weight: bold;
      }

      /* Number badge (for list items) */
      .number {
        font-size: 120px;
        font-weight: 900;
        color: var(--accent);
        opacity: 0.15;
        position: absolute;
        top: -40px;
        left: -20px;
        z-index: 0;
      }

      /* Branding footer */
      .brand {
        position: absolute;
        bottom: var(--slide-padding);
        right: var(--slide-padding);
        font-size: var(--small-size);
        opacity: 0.7;
      }

      /* ===========================================
           STYLE-SPECIFIC OVERRIDES
           Drop preset styles in here
           =========================================== */
      /* ... preset-specific CSS ... */
    </style>
  </head>
  <body>
    <div class="slide-content">
      <!-- Slide content goes here -->
      <h1>Your Title Here</h1>
      <p>Your content here</p>
    </div>

    <div class="brand">@yourbrand</div>
  </body>
</html>
```

### Content Slide Templates

**Cover Slide:**

```html
<div class="slide-content">
  <h1>5 AI GTM Workflows<br />You Should Be Using</h1>
  <p>Scale your outbound without scaling your team</p>
</div>
<div class="brand">@yourhandle</div>
```

**Numbered Item (e.g., Slide 2/6):**

```html
<div class="slide-content">
  <div class="number">01</div>
  <h2>Signal-Based Outbound</h2>
  <p>
    Track job posts, funding events, and tech stack shifts to find companies
    actively wrestling with the problem you solve.
  </p>
</div>
<div class="brand">@yourhandle • 1/5</div>
```

**Framework Slide:**

```html
<div class="slide-content">
  <h2>The GTM Engineering Stack</h2>
  <div class="framework-grid">
    <div class="box">Research</div>
    <div class="box">Personalization</div>
    <div class="box">Outreach</div>
    <div class="box">Tracking</div>
  </div>
</div>
<div class="brand">@yourhandle • 3/5</div>
```

**CTA Slide:**

```html
<div class="slide-content">
  <h2>Want more like this?</h2>
  <p>Follow me for more tips and workflows.</p>
  <div class="cta">Hit that follow button →</div>
</div>
<div class="brand">@yourhandle</div>
```

---

## Phase 4: Screenshot Generation

Once HTML is generated, capture screenshots automatically.

### Using Playwright (Recommended)

Write a Node.js script to screenshot every slide:

```javascript
// screenshot-slides.js
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

async function screenshotSlides(slidesDir, outputDir) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Match the LinkedIn carousel dimensions
  await page.setViewportSize({ width: 1080, height: 1080 });

  // Make sure the output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Gather every HTML file in the slides directory
  const slideFiles = fs
    .readdirSync(slidesDir)
    .filter((f) => f.endsWith(".html"))
    .sort();

  console.log(`Found ${slideFiles.length} slides to screenshot`);

  for (const slideFile of slideFiles) {
    const slidePath = path.join(slidesDir, slideFile);
    const outputName = slideFile.replace(".html", ".png");
    const outputPath = path.join(outputDir, outputName);

    console.log(`Capturing ${slideFile}...`);

    await page.goto(`file://${path.resolve(slidePath)}`);

    // Allow fonts and animations to settle
    await page.waitForTimeout(500);

    // Capture the screenshot
    await page.screenshot({
      path: outputPath,
      type: "png",
      fullPage: false,
    });

    console.log(`✓ Saved ${outputName}`);
  }

  await browser.close();
  console.log("\n✨ All slides captured!");
}

// Usage
const carouselName = process.argv[2];
if (!carouselName) {
  console.error("Usage: node screenshot-slides.js <carousel-name>");
  process.exit(1);
}

const slidesDir = path.join(__dirname, carouselName, "slides");
const outputDir = path.join(__dirname, carouselName, "exports");

screenshotSlides(slidesDir, outputDir);
```

### Installation

The skill directory requires these dependencies:

```json
{
  "name": "linkedin-carousel-screenshots",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "playwright": "^1.40.0"
  }
}
```

First-time setup:

```bash
cd /path/to/skills/create-html-carousel
npm install
```

### Running Screenshot Script

Once the HTML slides exist:

```bash
node screenshot-slides.js carousel-name
```

The script will:

1. Open each slide's HTML in a headless browser
2. Lock the viewport to 1080×1080px
3. Pause for fonts/animations
4. Capture the PNG screenshot
5. Save it under `[carousel-name]/exports/`

---

## Phase 5: Delivery

After screenshots finish, surface this to the user:

```
✨ Your LinkedIn carousel is ready!

📁 Location: /assets/carousel-name/

**Slides:**
- 6 HTML slides in slides/ folder
- 6 PNG images in exports/ folder (1080×1080px)

**Preview:**
Open index.html to see every slide with navigation.

**Upload to LinkedIn:**
1. Create new post on LinkedIn
2. Click "Add media"
3. Upload all PNGs from exports/ folder in order
4. Add your post copy
5. Publish!

**File sizes:**
- slide-01.png: 234 KB ✓
- slide-02.png: 198 KB ✓
- slide-03.png: 256 KB ✓
(All under 10MB limit)

Want to make any changes to the slides?
```

---

## Style Adaptation for Square Format

Every style from frontend-slides translates to carousels, with a few tweaks:

### Typography Scaling

The square format has less horizontal real estate, so fonts need to scale:

| Element  | Presentation (16:9)              | Carousel (1:1) |
| -------- | -------------------------------- | -------------- |
| Title    | clamp(2rem, 6vw, 5rem)           | 72px (fixed)   |
| Subtitle | clamp(1.25rem, 3vw, 2.5rem)      | 36px (fixed)   |
| Body     | clamp(0.875rem, 1.5vw, 1.125rem) | 28px (fixed)   |
| Small    | clamp(0.75rem, 1vw, 0.875rem)    | 20px (fixed)   |

**Why fixed sizes?** A single export dimension (1080×1080px) — not responsive web viewing.

### Layout Adjustments

**Vertical space is precious:**

- Trim top/bottom padding (80px in place of 4rem)
- Pack line-height tighter (1.2-1.4 instead of 1.5-1.6)
- Cap list items per slide (3-4 maximum)
- Reduce decorative elements

**Mobile-first mindset:**

- The majority of LinkedIn impressions happen on phones
- Text must remain legible at thumbnail size
- High contrast is essential
- Bold, simple layouts beat intricate compositions

---

## Content Best Practices

### Hook Formula (Cover Slide)

Strong hooks for LinkedIn carousels:

- Number + Promise: "5 workflows that 10x'd our outbound"
- Contrarian: "Stop doing X. Do this instead."
- Before/After: "How we went from X to Y in 30 days"
- Question: "Why are only 3% of founders doing this?"
- Curiosity gap: "The GTM strategy nobody talks about"

### Body Slides (Items 2-9)

Every slide should:

1. **Make one clear point** — Avoid stacking concepts
2. **Show visual hierarchy** — Bold number/icon + heading + body
3. **Stay concrete, not abstract** — "Use job postings to find intent" beats "Leverage signals"
4. **Stay scannable** — Two-to-three-second read time

### Closing Slide

Always finish with a CTA:

- "Follow for more [topic]"
- "Repost if this helped"
- "Comment your biggest takeaway"
- "DM me if you want the full playbook"

Avoid:

- "Link in comments" (frequently buried)
- "Check out my website" (reads as salesy)
- No CTA at all (wasted real estate)

---

## Troubleshooting

### Fonts Not Loading in Screenshots

**Symptom:** Default system fonts show up in the screenshot

**Solution:**

1. Use web-safe fonts (Arial, Georgia) OR
2. Add `await page.waitForLoadState('networkidle')` ahead of the screenshot
3. Bump the wait: `await page.waitForTimeout(1000)`

### Screenshots Are Blurry

**Symptom:** Text appears fuzzy or low-res

**Solution:**

1. Crank the device scale factor in Playwright:
   ```javascript
   await page.setViewportSize({
     width: 1080,
     height: 1080,
     deviceScaleFactor: 2, // Retina-quality
   });
   ```

### Content Overflows the Slide

**Symptom:** Text or elements clipped in the screenshot

**Solution:**

1. Reduce font sizes
2. Shrink padding
3. Split the content across more slides
4. Simplify (fewer bullets, shorter copy)

### Colours Look Different in Export

**Symptom:** PNG colours diverge from the HTML preview

**Solution:**

- Confirm the browser colour profile is sRGB
- Use hex colours; some CSS filters render unpredictably
- Test the screenshot script before mass-generating slides

---

## Preset Quick Reference

| Preset          | Best For               | Vibe                  |
| --------------- | ---------------------- | --------------------- |
| Bold Signal     | Confident, high-impact | Professional          |
| Dark Botanical  | Elegant, premium       | Sophisticated         |
| Notebook Tabs   | Editorial, organised   | Friendly-professional |
| Pastel Geometry | Friendly, approachable | Playful               |
| Neon Cyber      | Tech, innovation       | Futuristic            |
| Split Pastel    | Creative, fun          | Energetic             |

Refer to STYLE_PRESETS.md for the complete styling reference.

---

## Related Skills

- **frontend-slides** — Full presentations (not carousels)
- **personalized-email** — Outreach content to pair with LinkedIn posts
- **deep-web-research** — Background research for carousel topics/stats

---

## Example Session Flow

1. User: "Create a LinkedIn carousel about 5 AI GTM workflows"
2. Skill asks: content type, slide count, content ready?
3. User shares bullet points covering the 5 workflows
4. Skill asks for a style preference
5. User picks "Bold Signal"
6. Skill produces 7 HTML slides (cover + 5 workflows + CTA)
7. Skill auto-runs the screenshot script
8. Skill hands over a folder with HTML + PNG exports
9. User uploads PNGs to LinkedIn and publishes

Total turnaround: 5-10 minutes from idea to publish-ready carousel.
