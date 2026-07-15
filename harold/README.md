# Harold

Harold is an automated pipeline that turns [Good News Network](https://www.goodnewsnetwork.org/)
articles into Instagram-ready cards and posts them. **Everything is code — no Canva, no manual
design step.** The single-word orange recolor on the headline (the GNN signature) is done in a
locked HTML/CSS template and screenshotted with a headless browser.

## The four stages

| Stage | Module | What it does |
|-------|--------|--------------|
| fetch | `src/fetch.js` | Pull latest articles from GNN's RSS feed → `[{title, heroImage, link, excerpt}]` |
| editorial | `src/editorial.js` | Pick the article + choose which 1–3 headline words go orange; write the caption |
| render | `src/render.js` | Fill the locked template and screenshot it to a 1080×1350 JPEG |
| publish | `src/publish.js` | Post the JPEG to Instagram via the Graph API |

`src/run.js` orchestrates the chain end-to-end (one post per run) and a daily cron kicks it off.

## Layout

```
harold/
  src/
    browser.js      # shared Playwright/Chromium launcher
    fetch.js        # RSS → articles (+ posted.json ledger)
    editorial.js    # pick article + pickOrangeWords() + caption
    render.js       # {heroImage, headline, orangeWords} → out/card.jpg
    publish.js      # out/card.jpg + caption → Instagram
    run.js          # fetch→editorial→render→publish; --dry-run default
  template/
    card.html       # THE LOCKED TEMPLATE — do not restyle once approved
    card.css
    fonts/          # bundled Anton (swap point for GNN's licensed face)
  scripts/
    make-hero.js    # deterministic wind-farm hero for the acceptance test
    acceptance.js   # renders out/egypt.jpg
  deploy/harold.cron
  out/              # rendered JPEGs (gitignored)
  data/posted.json  # ledger (gitignored)
```

## Setup

```bash
cd harold
npm install
cp .env.example .env   # fill in real values
```

Chromium: `render.js` uses Playwright's Chromium. In environments where a browser is
preinstalled (e.g. `PLAYWRIGHT_BROWSERS_PATH`), Harold finds it automatically; otherwise
run `npx playwright install chromium` once, or set `HAROLD_CHROMIUM=/path/to/chrome`.

## Acceptance test (do this first)

Renders the reference card to `out/egypt.jpg` and checks it's a 1080×1350 JPEG:

```bash
node scripts/make-hero.js   # generates a deterministic wind-farm hero
npm run acceptance          # renders out/egypt.jpg
```

Headline `EGYPT: THE WINDIEST COUNTRY STARTS PROJECT TO POWER 6 MILLION HOMES`,
with `WINDIEST` and `POWER 6 MILLION` in orange.

## Local end-to-end test

`npm run e2e` proves the whole chain without external network: it serves a mock GNN feed on
localhost, then runs fetch (RSS + hero resolution) → editorial (single-span rule) → render
(1080×1350 JPEG) → caption, and verifies the posted.json ledger prevents repeats.

## Running the pipeline

**Dry-run is the default — nothing is posted unless you pass `--live`.**

```bash
npm run dry-run            # fetch + editorial + render; prints caption; no posting
node src/run.js --live     # actually publishes to Instagram
```

Individual stages are runnable too:

```bash
node src/fetch.js 5                                   # newest 5 unposted items (JSON)
node src/editorial.js "EGYPT: THE WINDIEST COUNTRY…"  # orange-word choice
node src/render.js "HEADLINE" "WORD1,WORD2" <heroUrlOrPath> out/card.jpg
```

## The template (`template/card.html` + `card.css`)

This is the signature — **approved 2026-07-15 and locked. Do not restyle.** Downstream just fills it.

- Canvas exactly **1080×1350**.
- Background: article hero photo, `object-fit: cover`, full bleed.
- Dark gradient scrim (transparent top → near-black bottom) for headline legibility.
- GNN flower logo (white seed-of-life cluster in a ring), white on transparent, centered up top.
- Headline: bottom-left, heavy condensed uppercase (Anton), **auto-fit** so 1–3 lines
  always fill the safe box without overflow (`render.js` scales font-size down until it fits).
- Keywords: **one contiguous span** of the headline is wrapped in `<span class="kw">…</span>`
  and recolors to GNN orange — a single highlight, never two separate spots. The rest stay white.

Two knobs, both in `card.css`:

- `--headline-font` — the display face. Default **Anton** (bundled `template/fonts/Anton-Regular.woff2`).
  To use GNN's licensed face: drop its `.woff2` in `template/fonts/`, update the one `@font-face`
  `src`, and change the var. One-line swap.
- `--gnn-orange` — the accent color for `.kw`. Placeholder is `#EA5B26`; **replace with GNN's exact hex.**

Rendering is deterministic: the hero is inlined as a data URI and fonts are bundled, so the
same inputs produce a byte-stable JPEG.

## Editorial (`src/editorial.js`)

`pickOrangeWords(headline)` chooses **one contiguous span** (1–4 adjacent words) that carries the
good-news punch — the outcome (verb + number + what it counts, a superlative, the hopeful payoff;
e.g. "POWER 6 MILLION HOMES") — and returns the **exact verbatim substring** to wrap. The highlight
is always a single run, never two separate spots. It's an LLM call (Anthropic, temperature 0) with
a tight prompt; if no API key is set it falls back to a transparent heuristic (number outcome →
superlative → longest content word). Every choice is logged.

## Publishing to Instagram (`src/publish.js`)

The Graph API can **only ingest a PUBLIC image URL** — it cannot accept a local file or upload.
Harold uses **Netlify** for the public hosting:

1. **Deploy to Netlify.** After render, Harold deploys the JPEG to a **dedicated Netlify site**
   via the deploy API, under a **dated filename** (`card-YYYY-MM-DD.jpg`) — unique per post, so
   Meta's URL cache can never serve a stale card. The site's URL is `PUBLIC_IMAGE_BASE`.
2. **Create a media container** — `POST /{IG_USER_ID}/media` with `image_url` + `caption`.
3. **Publish** — `POST /{IG_USER_ID}/media_publish` with the returned `creation_id`.

⚠️ A Netlify deploy **replaces the whole site's content**, so `NETLIFY_SITE_ID` must point at a
site used only for Harold cards — never a real site. Old card URLs disappearing after the next
deploy is fine: Instagram copies the image at ingest time.

Netlify setup (once, ~5 min): dashboard → **Add new site → Deploy manually** (drag any placeholder
file) and name it e.g. `harold-cards` → note the site URL (`PUBLIC_IMAGE_BASE`) and, under
Site configuration → Site details, the **Site ID** (`NETLIFY_SITE_ID`) → then User settings →
Applications → **New access token** (`NETLIFY_AUTH_TOKEN`). Fill all three in `.env`.

Secrets (`IG_*`, `NETLIFY_*`) are read from env and **never printed**. You need an Instagram
Business/Creator account linked to a Facebook Page and a long-lived access token with
`instagram_content_publish` permissions.

## Scheduling

`deploy/harold.cron` runs the chain daily at **9:00am Central** (dry-run by default). Install with:

```bash
crontab deploy/harold.cron   # edit the absolute paths inside first
```

Flip `--dry-run` to `--live` in the cron once you've approved the dry-run output.

## Guardrails

- JPEG only, exactly 1080×1350.
- The template is locked once approved — downstream only fills it.
- Nothing posts live until a dry-run is approved (`--dry-run` is the default).
- All secrets via `.env`; nothing hardcoded, tokens never logged.
