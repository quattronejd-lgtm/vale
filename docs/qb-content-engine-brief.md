# Quattrone Brands Content Engine — Build Brief

**Purpose of this doc:** (1) a kickoff prompt you can paste into a fresh Claude Code
session to start the build, and (2) a reviewable design brief for Simon — questions
and pushback welcome before code gets written.

**Owner:** Joe Quattrone · **Reviewers:** Simon · **Date:** 2026-07-17
**Repo:** `quattronejd-lgtm/vale` (this doc lives at `docs/qb-content-engine-brief.md`)

---

## Kickoff prompt (paste this into the new session)

> You are working in the `quattronejd-lgtm/vale` repo. Read
> `docs/qb-content-engine-brief.md` in full — it is the authoritative brief.
> Then read `harold/README.md` (the proven pipeline you'll be forking) and
> `case-study/README-HANDOFF.md` (the Quattrone Brands design system and card
> templates you'll reuse). Build **Milestone 1 only**, exactly as specified in
> the brief: the serializer agent, run end-to-end on one chapter, producing
> reviewable drafts and rendered cards. Nothing publishes anywhere in
> Milestone 1 — no live credentials are needed or should be requested. Ask Joe
> only for the inputs listed under "What Joe provides." Follow Harold's
> established engineering conventions: locked templates, dry-run by default,
> ledgers for state, secrets via env only, small PRs with clear messages.

---

## Context: what already exists (don't rebuild it)

- **Harold** (`harold/` in this repo) — a proven, in-production pipeline:
  WordPress RSS → editorial (LLM picks story + highlight + caption) → render
  (locked 1080×1350 HTML template, headless Chromium) → publish (Netlify public
  URL → Instagram Graph API). Runs 4×/day via GitHub Actions, live on Good News
  Network's Instagram (@goodnewsnetwork) since 2026-07-15. Key patterns to
  preserve: **locked template, dry-run default, `*_LIVE` env switch, committed
  `posted.json` ledger, secrets never logged.**
- **Quattrone Brands design system** — `case-study/carousel/` has the full QB
  card system: brand tokens (paper `#FCFCFE`, ink `#1A1330`, teal `#13A493`,
  gradient `#7860C0→#48A8A8→#30C090`), bundled fonts (Inter Tight, Hanken
  Grotesk, JetBrains Mono), Joe's vector signature, and a working
  HTML-template→PNG render pipeline (`render.js`). The social templates for
  this build derive from it.
- **The book** — Joe's manuscript ("Nozempic" working title; personal wellness
  + neuroplasticity, human as hero / AI as companion). 11 of 13 chapters
  written and copyedited. This is the source reservoir.

## The goal — one closed loop

> Book chapter → serialized articles on **Beehiiv** (web + email, via API) →
> Beehiiv RSS → **Harold-QB** transcreates each article into branded cards →
> **Instagram + Facebook**, on schedule, unattended.
> **Substack** runs as a delayed manual mirror for discovery — never
> load-bearing.

Joe's operating pattern throughout: **direct → approve → run.** Judgment stays
human; the middle is automated.

## Architecture: two agents, one repo

**Do NOT extend Harold into a monolith.** The two jobs have different cadences,
risk profiles, and approval needs. Loose coupling via the published feed.

```
┌─────────────┐   drafts    ┌──────────────┐  API publish   ┌─────────┐
│ SERIALIZER   │──────────▶ │ Joe approves │ ─────────────▶ │ Beehiiv │──┐
│ (new agent)  │  + metadata│  (queue/PR)  │   (web+email)  │  (home) │  │ RSS
└─────────────┘             └──────────────┘        │       └─────────┘  ▼
     ▲                                              ▼               ┌──────────┐
  manuscript                              Substack mirror           │ HAROLD-QB │
  (chapters)                              (manual paste, ~48h lag,  │  (fork)   │
                                           optional, non-blocking)  └────┬─────┘
                                                                         ▼
                                                              QB Instagram + Facebook
                                                              (4 slots/day, cron, ledger)
```

### Agent 1 — the Serializer (new; needs a name, Joe to christen)

- **Input:** one book chapter (markdown or docx).
- **Job:** carve it into 2–4 standalone articles; **transcreate, don't excerpt**
  — shift first-person memoir into reader-facing teaching, per an editorial
  constitution (drafted with Joe as part of Milestone 1; it encodes voice, the
  human-hero/AI-companion frame, and health-content guardrails: personal
  results as credibility not promise, no before/after framing).
- **Content pillars (Joe, 2026-07-17 — every article gets tagged to exactly
  one; the mix sets the feed's rhythm):** The book is a human-transformation
  book; weight loss is the proof domain, not the subject.
  1. **Denial & The Turn** — seeing clearly, big moments, decision making
  2. **Daily Practice** — systems, habits, protocols over willpower
  3. **Overcoming Obstacles** — resistance, setbacks, plateaus
  4. **Growth & Transformation** — identity, development, becoming
  5. **AI-Assisted Weight Loss** — the Nozempic protocol; Joe's 70 lbs as
     lived case study (the ONLY health-content pillar; the Meta-sensitivity
     guardrails apply chiefly here)
- **Output per article (the contract with everything downstream):**
  1. `article.md` — the piece itself
  2. `beehiiv.json` — ready-to-send Create Post API payload
  3. `substack.md` — paste-ready mirror copy (with "originally published at →" pointer)
  4. `meta.json` — **the metadata sidecar**: hook line, pull-quote, key stat,
     highlight span, suggested card type per social post. Downstream never
     re-derives judgment an approved draft already contains.
- **Cadence & autonomy:** runs when fed, never on cron. Output lands in a
  review queue (PR or drafts folder). **Nothing advances without Joe's
  approval.** After approval, the Beehiiv publish step is one command (or one
  API call in Milestone 2).

### Agent 2 — Harold-QB (fork of `harold/`)

- Same four stages, re-pointed: **fetch** Beehiiv RSS (+ read the article's
  `meta.json` sidecar from the repo) → **editorial** becomes mostly a
  formatter (sidecar has the judgment) → **render** QB card templates (2–3
  formats derived from the Field Notes system: quote card, stat card, hook
  card) → **publish** to QB Instagram **and Facebook Page** via Meta Graph API.
- Keeps: ledger, dry-run default, `HAROLD_LIVE`-style switch, GitHub Actions
  cron (off the :00 minute), per-run unique filenames, hero/quality gate ideas.
- New: multi-platform publish (IG + FB share one Meta app), multi-format
  template choice driven by the sidecar.

## Platform decision (settled, but Simon may pressure-test)

- **Beehiiv = system of record.** It has a real **Create Post API** (Send API,
  `posts:write` scope) → the loop closes with zero manual steps. All CTAs,
  the email list, and Harold's feed live here.
  ⚠️ *Open item:* Send API access is gated (request via success manager /
  help desk) — **confirm which plan tier includes it before subscribing.**
- **Substack = storefront mirror.** No API exists; the manual paste (~5
  min/article, delayed ~48h) is acceptable only because it's optional and
  non-blocking. Substack posts always point to Beehiiv, never the reverse.
  If it's ever a burden, drop it; nothing downstream notices.

## Design direction

**One system, already built:** everything derives from the QB Field Notes design
system in `case-study/carousel/` — tokens, fonts, header/footer grammar, the
signed-by ink card, Joe's vector signature. No new visual language gets invented
for this pipeline. **Templates are locked the Harold way:** one acceptance
render per format, Joe approves it, then it's frozen — downstream only fills.

### Beehiiv articles should look like: *a Field Note in long form*

- **Publication chrome** (set once in Beehiiv's template settings, not
  generated): QB wordmark, ink/paper palette, brand fonts where the platform
  allows.
- **Generated per article by the serializer:**
  - A **header card** (~1200×630, doubles as the OG/share image): Field Notes
    cover grammar — gradient bar, wordmark, mono meta line
    (`FIELD NOTES / <SERIES> · NO. X`), article title with one gradient phrase.
  - **One pull-quote block** per article in the brand style.
  - The **signed-by ink card** as the article footer (asset:
    `case-study/carousel/assets/signature.svg`), with the envelope-ID motif.
  - A consistent **CTA block** (destination per Simon's Q1).
- Prose formatting rules (paragraph length, bolding, section eyebrows) belong
  in the editorial constitution, not here.

### Meta posts should look like: *Field Notes cards — typographic, not photographic*

Deliberately **distinct from GNN's photo-background style**. QB's identity is
the paper/ink/typographic aesthetic of the case-study carousel — which is about
to be the brand's most visible artifact; the daily feed should look like it
came from the same hand. Three locked formats, all 1080×1350, same
header/footer grammar, chosen per-post via the metadata sidecar:

1. **HOOK card** — cover-style: big display headline with one gradient phrase,
   one-line lead. (The workhorse.)
2. **QUOTE card** — the article's pull-quote, large, with attribution line.
3. **STAT card** — one big number/claim + context line (the "Payroll ≈ $0"
   slide is the reference).

Same asset posts to both Instagram and Facebook — no per-platform variants in
v1 (elegant beats optimal). Photography can join later as a fourth format if
the feed needs air; it is out of scope for Milestone 1.

## Milestone 1 — acceptance test (build this first, nothing publishes)

One chapter, end to end, all local/repo artifacts:

1. Editorial constitution drafted with Joe (short doc, versioned in repo).
2. Serializer produces 2–3 articles from the chapter, each with all four
   output files.
3. The three card templates (hook / quote / stat) built from the case-study
   design system; one acceptance render of each approved by Joe, then locked;
   cards rendered from each article's sidecar. The Beehiiv header card counts
   as a fourth template, same approval flow.
4. Joe reviews articles + cards and reacts. Iterate until one full article
   packet is approved.
5. **Exit criteria:** approved packet exists; zero external publishes; no live
   credentials touched.

Milestone 2 (separate approval): Beehiiv account + Send API wired, QB Meta
credentials, first supervised live publish, then cron.

## What Joe provides

- [ ] One chapter of the manuscript (Milestone 1 needs just one)
- [ ] Decision: agent name for the serializer
- [ ] ~1 hour for the editorial-constitution draft review
- [ ] Later (Milestone 2): Beehiiv account + Send API tier confirmation, QB
      Instagram professional account + Facebook Page + Meta app credentials,
      final call on the Nozempic name's public prominence

## Open questions for Simon

1. Anything in the cohort/funnel plan that changes where CTAs should point
   (Beehiiv signup vs. cohort waitlist vs. book preorder)?
2. Comfort level with the health/weight-loss content guardrails as scoped —
   anything stricter needed for Meta ads later? (Organic-only is assumed for now.)
3. Email strategy: one Beehiiv list from day one, or segment
   (book-audience vs. cohort-prospects) at launch?
4. Cadence check: serializer output pace vs. Harold-QB's 4 daily slots —
   comfortable starting slower (e.g., 1–2 posts/day) while the archive builds?
5. Anything you'd cut from Milestone 1 to ship faster — or anything missing
   that would make you veto a live launch later?

## Engineering conventions (inherit from Harold)

Locked templates once approved · dry-run by default, live behind an explicit
env switch · committed JSON ledgers for state on ephemeral runners · secrets
via env only, never logged, scrub invisible unicode/quotes on read · small
PRs, one concern each · every pipeline has a local E2E test with a mock feed ·
token expiry (Meta ~60 days) needs a refresh reminder or health-check alert
before Milestone 2 ends.
