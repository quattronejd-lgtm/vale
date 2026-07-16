# Harold Case Study — Handoff Package

**What this is:** the complete "Field Notes / The Build" case study — Joe Quattrone /
Quattrone Brands. A 10-slide branded carousel + copy system telling the story of
Harold, an AI agent built in one day that publishes to Good News Network's
Instagram (@goodnewsnetwork) four times daily.

**Canonical source:** GitHub repo `quattronejd-lgtm/vale`, branch
`claude/gnn-harold-build-0p330a`, directory `case-study/`. Everything here is
regenerable from that source.

---

## Package contents

```
publish/
  instagram/harold-carousel-01..10.png   ← post as a carousel, in order (1080×1350)
  linkedin/harold-carousel-LinkedIn.pdf  ← upload as a LinkedIn "document" post
copy/
  harold-copy-3cuts.md   ← captions & scripts: 2 video cuts, 11-post X thread,
                            LinkedIn post text (CUT 3 = the LinkedIn caption)
  harold-case-study.md   ← full fact base, narrative arc, teaching moments
source/
  harold-carousel.html   ← the 10 slides, locked QB design system, self-contained
  render.js              ← re-renders PNGs + PDF (Playwright/Chromium)
  fonts/                 ← Inter Tight, Hanken Grotesk, JetBrains Mono, bundled
  assets/signature.svg   ← Joe's real signature, vector (also .png)
```

## Publishing quick-start (after the call)

- **Instagram:** create a carousel post with `publish/instagram/*.png` in filename
  order. Caption: adapt thread posts 1/8/10/11 from `copy/harold-copy-3cuts.md`,
  or the Video 1 script's hook + close.
- **LinkedIn:** create a post → add a **document** → upload the PDF. Post text =
  CUT 3 in `copy/harold-copy-3cuts.md`, verbatim or trimmed.

## For the design team (embedding in a larger presentation)

- **Slides are HTML, not flattened art.** `source/harold-carousel.html` renders each
  `<section class="slide">` at exactly 1080×1350. Restyle, resize, or lift any slide:
  edit the HTML/CSS and run `node render.js` (needs Playwright; any Chromium works).
- **Brand tokens** (in `:root` of the HTML): paper `#FCFCFE`, ink `#1A1330`,
  body `#46425E`, muted `#8A86A4`, teal `#13A493`, rose `#C4464C`, indigo `#262150`,
  gradient `#7860C0 → #48A8A8 → #30C090` (reserved for ONE emphasized phrase per slide).
- **Type:** Inter Tight (display), Hanken Grotesk (body), JetBrains Mono (data/meta) —
  all bundled in `fonts/`, no network needed.
- **Signature:** `assets/signature.svg` is stroke-based vector; recolor by changing
  the `stroke` value. Use only in the signed sign-off context.
- **For a 16:9 deck:** slides port cleanly — keep the header/footer grammar, let the
  content zone breathe wider. The fact ledger for any new layouts is at the bottom
  of `copy/harold-copy-3cuts.md`; don't restate numbers from memory.

## Fact ledger (verified against git history + post ledger)

First commit 2026-07-14 6:57pm CT · design locked +16 min · first live post
2026-07-15 8:16am CT (13h 20m commit→live) · 24 PRs in ~24h · 12 live posts day
one · 6 keepers after Joe's edit · 4 posts/day since · ≈$0/mo infrastructure.
