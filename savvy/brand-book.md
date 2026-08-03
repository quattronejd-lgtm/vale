# Savvy Lab Solutions — Brand Book (v1.1 · August 2026)

Stewarded by Quattrone Brands. This edition integrates the final logo lockup (designed by Shaana), which **supersedes any earlier logo or lockup guidance**. An interactive edition with a dark/light theme toggle lives at [`brand-book.html`](./brand-book.html).

---

## 01 · At a glance

Savvy Lab Solutions is a members-only **buying collective** for dental labs — pre-negotiated vendor pricing usually reserved for the few, plus the education and community that sharpen how a lab is run.

- **Positioning:** The insider standard for lab owners who want to pay like the biggest players — without having to become one.
- **Archetype:** Ruler (~70%) with an Outlaw edge (~30%) — established and authoritative, willing to break the old pricing game.
- **Primary lens:** Magnet — "become this." Aspirational, insider. Mirror ("we see you") is the secondary voice.
- **Tagline:** "Built by a lab owner, for lab owners."
- **Primary CTA (always):** "Become a member →"

---

## 02 · The lockup

**One mark. Two grounds.**

The lockup — designed by Shaana — is the brand's signature. Three parts, always together in primary use:

1. **Wordmark** — *SaVvy* in the brand serif (OC Bartok; see Typography), natural case with the interior capital V. The **y is customized**: its tail continues the right stroke's diagonal in one straight line down to a flat horizontal cut — no kink at the junction, no curl, no ball terminal. Never substitute the stock glyph in the lockup (stock glyphs are fine in running headlines).
2. **Divider** — a thin rule broken by the **chain link**: two interlocked links, the collective drawn as a mark. Labs linked together buy like the biggest. The link sits slightly **right of the capital V's center** (not centered on the wordmark), and the right rule ends short of the y's descender, leaving clear air between rule and tail.
3. **Sublabel** — *LAB SOLUTIONS*, uppercase, widely tracked (~0.58em), in the lockup's own light sans, **vertically stretched (~116%)** per the master art. This face lives only in the lockup.

### Color variants

| Variant | Mark | Ground | Use |
|---|---|---|---|
| Primary | Champagne `#C9B78C` | Onyx `#0A0A0B` | Default wherever the brand leads dark |
| Light ground | Deep gold `#8A6B2E` | Cream `#EFE9E0` / white | Champagne never sits directly on white or cream |
| One-color | Ink `#1A1610` | Cream / white | Documents, engraving, anywhere gold can't print |

### Clear space & minimum size

- Clear zone of **one cap-height of the S** ("1S") on all four sides — no copy, rules, or photographic focal points enter it.
- Minimum width: **140 px** digital / **32 mm** print for the full lockup.
- Below minimum: drop the divider and sublabel; use the wordmark alone. The wordmark alone is also the compact mark (headers, favicons, social avatars).

### Do

- Use the full three-part lockup in primary placements.
- Scale the whole lockup as one unit — proportions are fixed.
- Place over photography only with an onyx scrim behind it.

### Don't

- Recolor, add gradients, or apply rose gold / two-tone gold.
- Separate or rearrange the divider and sublabel.
- Set champagne directly on white or cream.
- Stretch, outline, shadow, or re-set in another typeface.

**Master assets:** Shaana's original PNG is the reference of record; production vector (SVG/EPS) and OC Bartok font files are being collected into `savvy/assets/`. The lockup in `brand-book.html` is a live vector recreation — swap in the master files when they land.

---

## 03 · Color

**Onyx and champagne. No brown.**

Neutral onyx darks with a single warm accent — champagne. **Champagne is the only warm element on the page.** Dark surfaces stay true neutral onyx (never warm ink-black) so black and champagne read crisp and never drift toward brown. On light, use cream grounds with ink text and deep gold for gold lettering.

| Name | Hex | Use |
|---|---|---|
| Onyx | `#0A0A0B` | Primary dark ground |
| Onyx raised | `#161618` | Cards / panels |
| Onyx raised 2 | `#232327` | Borders / hover |
| Champagne | `#C9B78C` | The single accent |
| Pale | `#EADFBF` | Tracked labels on dark |
| Cream | `#EFE9E0` | Light ground |
| Ink | `#1A1610` | Text on light |
| Deep gold | `#8A6B2E` | Gold text on white |

Supporting values: hairline borders `rgba(255,255,255,.10)` on dark / `rgba(26,22,16,.14)` on light; body text `#D6D4CE` on dark; muted `#9A9A9E`.

**Do**
- Keep darks neutral onyx.
- Use champagne sparingly, as one warm note.
- Champagne needs a dark ground; use deep gold (`#8A6B2E`) on white.

**Don't**
- Warm ink-black grounds (they read UPS-brown next to gold).
- Leather, brushed-brass, or smoked-brown textures.
- Rose gold, brass, or two-tone gold gradients.

---

## 04 · Typography

**The brand serif leads. Inter handles the rest.**

- **Display / headlines — OC Bartok Light** (client's serif; until the font file is in hand, fall back to Cormorant 300, then Georgia). It sets the wordmark *and* every headline, so the logo and the copy speak the same voice. Tight leading, light weight, large sizes.
- **Body / UI — Inter** (400/500/600). Body at 16px / 1.7. Also used for tracked eyebrows and labels: uppercase, 0.3–0.5em letter-spacing, champagne.
- **Sublabel face** — the tracked light sans that sets "LAB SOLUTIONS" in the lockup is reserved exclusively for the lockup — never headlines or body. *(Supersedes v1: the Cinzel reservation is retired; the final lockup's sublabel face replaces it.)*

Type scale: Display 46 · H2 32 · H3 22 · Body 16 (Inter) · Eyebrow 11 (tracked uppercase).

CSS stacks:
- Serif: `'OC Bartok','Cormorant',Georgia,serif`
- Sans: `'Inter',system-ui,sans-serif`

> **Open item:** confirm with Shaana which lockup element OC Bartok sets (wordmark vs. sublabel) and collect the licensed font files — or better, a vector master (SVG with text outlined, EPS, AI, or PDF), which replaces all stand-ins at once. The interactive book currently uses Prata with a custom-cut y (lockup wordmark), Cormorant (headlines), and tracked Montserrat Light (lockup sublabel) as stand-ins.

---

## 05 · Usage

- **Buttons:** Primary = champagne fill (`#C9B78C`), ink label (`#1A1610`), text always "Become a member →". Ghost = transparent, champagne text, 1px champagne-hairline border (`rgba(201,183,140,.5)`).
- **Eyebrows & rules:** Champagne tracked uppercase eyebrow (11px, 0.3em tracking) over a thin champagne-to-transparent gradient rule opens a section.
- **Surfaces:** Onyx ground; raised onyx (`#161618`) cards with hairline borders and 14px radius. The onyx-glass tile is the premium presentation surface — heroes and signage, not everyday UI.
- **Labels & chips:** Rounded pill, champagne hairline border (`rgba(201,183,140,.35)`), pale text (`#EADFBF`) — for benefit tags and metadata.

---

## 06 · Avoidances

- No brown grounds.
- No gold gradients on type or marks; never rose gold.
- No lockup sublabel face in body copy.
- No more than one champagne accent competing in a single view.
- No emoji or exclamation-heavy copy.
- Never say "buying group" — it is a **collective**.
- Never use the "room / take your seat" metaphor.

---

## 07 · Tone of voice

**Plain-spoken. From the bench. Never hype.**

Savvy sounds like the sharpest lab owner you know — confident, generous with what it knows, allergic to fluff. The **Magnet** lens leads: describe the lab you could become and make membership the obvious next move. The **Mirror** lens supports: show members we understand their world.

Key phrases:
- Tagline: "Built by a lab owner, for lab owners."
- CTA: "Become a member →"
- Say "buying collective," never "buying group."
- One message: become a member.

Three pillars:
1. **Pay like the biggest** — membership unlocks pricing the largest labs already enjoy.
2. **Get sharper** — education and community that improve how you run, not just what you spend.
3. **Belong to the standard** — join the labs setting the bar; become one of them.

**Do**
- Lead with the aspiration: "become one of them."
- Speak plainly, from experience, like an owner.
- Welcome all lab sizes.
- Drive every line toward becoming a member.

**Don't**
- Say "buying group."
- Use the "room / take your seat" metaphor.
- Hype, jargon, or emoji.
- Limit the pitch to small/mid labs.

**Sample hero:** "The best labs don't pay retail. Become one of them." Sub: "Membership unlocks pre-negotiated pricing, insider leverage, and the education that sharpens how you run. Built by a lab owner, for lab owners."

**Sample email:** Eyebrow "Your first month" → headline "Welcome to the collective." → body "You're in. Here's how to start paying like the biggest labs today — your member pricing across all 32 vendor partners is live in your dashboard." → CTA "Open my dashboard →" → sign-off "Built by a lab owner, for lab owners."

---

## 08 · Imagery

**Craft, shot like luxury.**

Photography treats the everyday craft of the lab — hands at the bench, restorations, materials, the quiet precision of the work — with the lighting and restraint of a luxury brand. Warm neutral light, deep shadow, shallow focus. Grade toward onyx and champagne; never candy-colored, never cheesy clinical stock.

Subject directions:
- Macro — a finished restoration, shallow focus.
- Hands at the bench — warm key, deep shadow.
- Materials & tools — quiet, ordered, precise.

- **Duotone option:** onyx→champagne duotone for graphic moments; sparingly, hero panels only.
- **Text over image:** always place an onyx scrim (bottom gradient to ~60% black) behind copy so champagne and white stay legible.

**Do:** warm-neutral editorial lighting; real work, real hands, real materials; onyx/champagne grade; generous negative space.
**Don't:** bright clinical stock or blue-white light; cheesy smiles, thumbs-up, fake teamwork; rainbow product shots or busy collages.

---

## 09 · Applied examples (guidance)

- **Social post:** onyx ground, champagne headline, one message. Caption plain and from-the-bench; CTA points to membership. One champagne accent per frame.
- **Email:** serif headline, Inter body, a single champagne CTA. Every send drives one action — join, enroll, or open the dashboard.
- **Business card / signage:** front on onyx glass, back ink-on-cream. The glass tile is the signature presentation surface across print and environmental.

---

*Changelog — v1.1 (Aug 2026): integrated the final logo lockup by Shaana (new §02, supersedes all prior logo guidance); retired the Cinzel sublabel reservation; renumbered §03–§09; added interactive HTML edition with onyx/cream theme toggle.*
