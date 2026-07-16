# Harold: A Case Study — WORKING DRAFT

> **Status:** Working draft. Facts verified against git history. Sections marked
> `[SLOT: …]` need Joe's input or Quattrone Brands assets before publication.
> **Audience:** Cohort students (teaching version) + LinkedIn/general (prospect version).
> **Publisher:** Quattrone Brands.

---

## Working titles (pick one or riff)

1. *"I Shipped an Autonomous Social Media Employee in One Day"*
2. *"Harold: What Building With AI Actually Looks Like (Receipts Included)"*
3. *"From First Commit to Live on Instagram in 13 Hours — No Designer, No Canva, No Team"*
4. [SLOT: Joe's title preference or alternative]

---

## The verified fact base

Every number below is pulled from the repository's git history and post ledger —
this is the "receipts included" backbone of the case study.

| Fact | Value | Source |
|------|-------|--------|
| First Harold commit | July 14, 2026, 11:57pm UTC | git history |
| Card template approved & locked | July 15, 12:13am UTC — **16 minutes after first commit** | commit `586b90b` |
| CI (e2e + acceptance render on every PR) | July 15, 12:41am UTC | commit `bdf36df` |
| Automated daily scheduler live | July 15, 9:41am UTC | commit `9c8f614`→PR #2 |
| **First live Instagram post** | July 15, 1:16pm UTC — **~13 hours 20 min after first commit** | posted.json ledger |
| Live posts on day one | **12** (1:16pm – 11:39pm UTC) | posted.json ledger |
| Posts kept after Joe's edit | **6** — Joe deliberately let posts run live to compare against the brand's existing feed, then pulled the ones that didn't earn their spot | Joe, 2026-07-16 |
| Pull requests merged in ~24 hours | **24** | git merge history |
| Total commits | ~76 | git history |
| Manual design steps per post | **0** | architecture |
| Ongoing schedule | 4 posts/day (9a/12p/3p/6p CT), fully autonomous, no always-on machine | GitHub Actions |
| Cost of the infrastructure | ~$0/mo (GitHub Actions free tier + Netlify free tier) | architecture |

### What Harold is (one paragraph, plain English)

Harold is an automated pipeline that turns Good News Network articles into
branded Instagram cards and posts them — four times a day, on a schedule, with
no human in the loop. It reads the site's RSS feed, uses an LLM to pick the
story and choose which words of the headline get the brand's signature orange
highlight, renders the card from a locked HTML/CSS template with a headless
browser, hosts the image, and publishes through the Instagram API. Everything
is code. No Canva. No designer. No virtual assistant copying and pasting.

---

## The narrative arc (mapped to the actual PR history)

The 24 PRs tell the story honestly — including the unglamorous parts, which is
what makes this credible instead of another "AI built my app in an hour" post.

### Act 1 — The build (PRs 1–2, ~10 hours)
Pipeline skeleton, the locked template, CI on every PR, and a cloud scheduler.
The template was **approved and locked 16 minutes in** — the single most
important decision of the project (see "Teaching Moments" below).

### Act 2 — The grind (PRs 5–16, the messy middle)
Five separate PRs (#6, #8, #11, #12, #13) just to get Instagram API tokens
working: invisible unicode in pasted secrets, quote characters, two different
token "flavors" Meta doesn't document clearly. **This is the section most
AI-hype posts delete. We're leading with it.** Real automation work is 20%
magic and 80% plumbing — and the agent debugged its own plumbing.

### Act 3 — The taste loop (PRs 9–10, 17–21)
Font choice (Lilita One over Anton), gradient direction, logo size iterated
in ~6-pixel increments across five PRs. The human's job in this system:
looking at rendered cards and saying "the badge is too big" — creative
direction, not production. AI as hands, human as eyes.

### Act 4 — Quality gates and autonomy (PRs 22–24)
A hero-image quality gate with automatic stock-photo fallback so a bad
article photo can't produce an ugly post at 2am with nobody watching. Then
cron hygiene. This is the difference between a demo and an employee: **a demo
works when you watch it; an employee works when you don't.**

### The kicker
By 11:39pm on day one, Harold had posted 12 times to a live Instagram
account. It has posted 4 times a day since, unattended.

---

## Teaching moments (cohort version — the transferable lessons)

1. **Lock the template early.** The signature look was approved in 16 minutes
   and frozen. Every downstream decision became "fill the template," never
   "redesign the template." Constraint is what made autonomy safe.
   *Transferable rule: make judgment calls once, upstream, under supervision —
   then let the automated layer be dumb and reliable.*

2. **Dry-run is the default.** Nothing posted live until a human approved a
   rendered dry-run card, and going live required flipping an explicit
   `HAROLD_LIVE` switch. *Transferable rule: autonomy is granted, never
   assumed. Build the approval gate before you build the publisher.*

3. **The ledger pattern.** A committed `posted.json` file means the system
   never repeats itself even though every run starts from a blank cloud
   machine. *Transferable rule: give ephemeral agents durable memory in the
   simplest place that works — here, a JSON file in git.*

4. **Ship through the plumbing.** Five PRs of token debugging is not failure;
   it is the actual work. The agent hit the errors, diagnosed them, and fixed
   them — the human never opened Meta's documentation. *Transferable rule:
   judge AI collaboration by whether the messy middle got handled, not by
   whether there was one.*

5. **The human was the art director, not the operator.** Every human touch
   in the git history is a taste call or an approval — never production
   labor. That is the division of labor the whole system is designed around.

[SLOT: Joe — 1–2 lessons in your own words, especially anything that
surprised you or changed how you'll direct agents next time.]

---

## The thesis tie-in (human as hero, AI as companion)

[SLOT: Joe's framing — this section should connect Harold to the book's
thesis. Draft angle to react to:]

> Draft: "Everything I teach about working with AI is in this one day of git
> history. I didn't write the code. I also didn't 'prompt an app into
> existence.' I directed. I approved. I said 'the badge is too big' eleven
> different ways. The AI handled everything between my decisions — including
> the parts that would have taken me a week of reading Meta's documentation.
> The human is the hero of this story. The AI is the companion that makes the
> hero fast."

---

## Visual assets to produce

| Asset | Source | Status |
|-------|--------|--------|
| The acceptance card (Egypt wind-farm reference) | render from repo (`npm run acceptance`) | ready to generate |
| Template evolution strip (logo/badge iterations across PRs 17–21) | re-render card at each historical commit | ready to generate |
| Timeline graphic (first commit → live in 13h 20m) | **done — carousel slide 03** | ✔ |
| The PR list as an image ("24 PRs in 24 hours") | folded into carousel slides 03–04 | ✔ |
| Screenshot of the live Instagram grid | Joe's screenshot (received 2026-07-16; keeper-grid crop still useful) | partial |
| Architecture diagram (fetch → editorial → render → publish) | repo README | needs QB branding |
| **Field Notes carousel, 8 slides, QB branding** | `case-study/carousel/harold-carousel-*.png` | **✔ done** |
| 3-cuts copy (video / X thread / LinkedIn) | `case-study/harold-copy-3cuts.md` | **✔ done** |

---

## Distribution plan

| Channel | Format | Notes |
|---------|--------|-------|
| Cohort students | Long-form teaching version + live walkthrough of the repo | full "teaching moments" section |
| LinkedIn | Article (prospect version) + carousel of the visual assets | carousel = the meta-move: a case study about an Instagram card pipeline, told in cards |
| [SLOT: Substack?] | Could be the first Quattrone Brands Substack post — bootstraps the next project | Joe to decide |

**CTA:** [SLOT: Joe — what should a prospect do after reading? Cohort
waitlist link? DM? Newsletter signup?]

---

## Needed from Joe (blocking items)

1. **Branding materials:** logo files, brand colors (hex), fonts, any voice/
   style guide Quattrone Brands uses.
2. **Positioning decisions:** title choice; how much to reveal about tooling
   (name the specific AI tools, or keep it generic "AI agent"?). ~~Whether GNN
   is named~~ — **resolved 2026-07-16: named**, so readers can verify the
   build live at @goodnewsnetwork.
3. **Your quotes:** the thesis tie-in section and 1–2 teaching moments in
   your voice.
4. **The Instagram grid screenshot** (only you have account access).
5. **CTA + distribution decision** (Substack as a channel or not).

---

*Fact-checked against repository history on 2026-07-16. All timestamps UTC.*
