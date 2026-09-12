# HAROLD.md — Operating Spec & Self-Improvement Loop

**Agent:** Harold
**Owner:** Joe Quattrone / Quattrone Brands
**Channel:** Instagram @goodnewsnetwork (primary), Facebook /thegoodnewsnetwork (candidate)
**Job:** Convert the Good News Network RSS feed into single-image in-feed posts with text overlays.
**Spec version:** 2.1 — corrected 12 Sep 2026 with full-year data (9/11/25–9/11/26); v2.0 was rebuilt
9 Sep 2026 from a Meta export covering only 12 Aug – 8 Sep 2026. This version is the first to be
committed to the repo (`harold/HAROLD.md`) instead of living as a standalone document.

---

## 0. Read this first: why this spec exists

Between 12 Aug and 25 Aug 2026 Harold ran at 3.86 posts/day and produced 44,090 reach/day and 75.7 follows/day.

Between 26 Aug and 8 Sep 2026 Harold ran at 1.64 posts/day and produced 10,034 reach/day and 2.1 follows/day.

**Median reach per post went UP over that same period (3,068 → 3,555).** Nothing about the creative got worse. The only thing that changed was how many posts shipped. Output fell 57% and the channel fell 77%.

This is the same failure that killed the Facebook video lane and dragged Facebook's daily reach down 66% while its per-post median never moved. It is a volume failure wearing a performance failure's clothes.

**The single most important line in this file: Harold's job is to not miss.** Craft is already good enough. Consistency is the whole game.

---

## 0.5. Full-year context (added 12 Sep 2026)

A full year of exports (9/11/25–9/11/26, both platforms) landed after v2.0 was written. It changes
what this file can claim in three ways — read this before trusting section 2's numbers in isolation.

### The four-phase picture

Instagram had four distinct management eras in the trailing year. Joe's own account of who ran what,
cross-checked directly against the export (the 75-day dark gap is exact — found independently in the
data at 4/30→7/15, not just reported):

| Phase | Span | Posts | Posts/day | Dark days | Total reach | Total follows (per-post attribution) | Follows/1k ex-breakout |
|---|---|---|---|---|---|---|---|
| Charly Hillman (freelance) | 9/11/25–12/31/25 | 25 | 0.22 | 89/112 | 90,863 | 74 | 0.814 |
| Blue Lotus (agency) | 1/1/26–4/30/26 | 193 | 1.61 | 20/120 | 1,094,725 | 972 | 0.585 |
| Dark (nobody posting) | 5/1/26–7/14/26 | 0 | 0 | 75/75 | 0 | 0 | — |
| Harold | 7/15/26–present | 178 (as of 9/12) | 3.02 | 6/59 | 1,676,072 | 1,676 | **0.273** |

**The uncomfortable number, stated plainly: on a like-for-like basis, Harold converts reach to follows
worse than either prior manager, not better.** 0.273 follows/1k ex-breakout vs. Blue Lotus's 0.585 and
Charly's 0.814. Harold does not win by being a better per-impression converter. It wins by generating
breakouts more often — 9 in 178 posts (5.1%) vs. Blue Lotus's 5 in 193 posts (2.6%) — at a marginal
cost near zero. Section 1's "every post is a lottery ticket with a stable hit rate" framing is correct;
this table is the evidence that the *rate* itself, not just the volume, is part of what changed. Do not
let Harold's total-follows number get read as "better craft" without this caveat attached.

### The topic razor, reconfirmed on Harold's own breakout set

Harold's 9 breakouts, independently pulled from the full year: 3 were health/science stories
(Antiviral Chewing Gum, DNA-repair Alzheimer's drug, Central Retina Transplant). Those 3 — 33% of
Harold's breakouts — produced **83.6% of all breakout-driven follows** (1,235 of 1,477). This is the
same magnitude finding as section 2 below found on a different, shorter window, independently
replicated. Treat the topic razor as validated, not a hypothesis, going forward.

### Follows: two measurements exist and they don't reconcile — use the right one for the right question

Meta Business Suite's account-level Insights dashboard (Results tab) reports Instagram Follows for
the full year at **7.8K**. Summing the per-post "Follows" column across every post in the content
export gives **2,722** — well under half. These are not the same measurement: per-post attribution
only counts follows Meta's model pins to one specific post; the account-level total captures every new
follow in the period, including ones from profile browsing, search, and Explore that never attribute
to a single post. **The per-post export structurally undercounts total follower growth for every
phase, not just Harold's** — so the phase table above, and section 2's numbers, are a floor, not the
true total. For "which topic converts a breakout," per-post attribution is still the right tool (it's
relative, and the undercounting applies evenly). For "how many people actually started following us,"
use the account-level dashboard, not a sum of this column. Neither export contains a true net
follower-count-over-time series (gains minus unfollows) — that requires an Audience-tab pull, not
Results. Until that exists, "only Harold's tenure grew followers" is well-supported by the dashboard's
Follows chart shape (flat near-zero for 10 months, then a sharp rise concentrated in Harold's window)
but not proven as *net* growth.

### What changed in code because of this (12 Sep 2026)

- `harold/src/scoring.js`: `SCORE = TOPIC*2 + SHAPE + SPECIFICITY`, not the flat sum in section 3
  below. TOPIC is weighted double because it's the only one of the three signals with real evidence
  behind it (see above); SHAPE/SPECIFICITY still break ties within a topic tier but can no longer
  outvote it. This is a live correction to section 3, not just a note — section 3's formula is now
  historical/superseded by the code.
- `harold/src/editorial.js` + `run.js`: article selection now scores every fetched candidate and picks
  the highest, and holds the single best-scoring candidate out of non-evening slots so it lands in the
  6pm+ window (section 5's timing finding) instead of whichever slot saw it first. Never holds with
  only one candidate — the N2 floor still wins.
- `harold/src/fetch.js`: horoscopes are now actually filtered. The pattern list never had one despite
  the code comment claiming otherwise — section 3's "Stop queueing them" instruction was written but
  not implemented until now.
- `harold/INCIDENTS.md` and a preflight IG-token-health check (`scripts/check-token-health.js`) exist
  as of this version too — see that file for the Netlify outage that produced the 7/23–7/24 dark days
  visible in the phase table above.

---

## 1. Non-negotiables

These are hard rules. Violating one is a failure condition, not a judgment call.

| # | Rule | Threshold |
|---|------|-----------|
| N1 | **Never go dark.** A calendar day with zero posts is a P0 incident. | 0 dark days |
| N2 | **Floor of 4 posts/day, 7 days/week.** Weekends included. | ≥ 4/day |
| N3 | **Single images only.** No carousels, no Reels. | 100% single image |
| N4 | **Post at natural, scattered minutes.** Never a fixed `:01`. | no clock fingerprint |
| N5 | **Never re-post a story already published to the same channel.** | 0 duplicates |
| N6 | **Log every post and every skip** to `harold_log.jsonl` with a reason code. | 100% logged |

Dark days observed in the last 28 (as of the 9 Sep spec): **27 Aug, 28 Aug, 31 Aug.** Full-year dark
days for Harold's own tenure: **7/23 and 7/24** (Netlify token failure — see `INCIDENTS.md`) plus 4
more scattered days, 6 total in 59 days. Every one costs roughly a day's reach with no recovering it.

### Why 4/day and not 3, and not 6

Follows arrive almost entirely through breakout posts (>20k reach). The breakout **rate** is stable at ~5% of posts regardless of volume (5.6% in the high-output half, 4.3% in the low-output half; 5.1% across Harold's full 178-post tenure, 2.6% for Blue Lotus's 193 posts — see 0.5 above). Every post is a lottery ticket with a fixed-ish hit rate and a marginal cost of about zero.

So followers scale with the number of tickets bought. Cutting output 57% cut the follower engine 97%.

Test 5–6/day. Do not drop below 4 to "protect quality" — the data says quality per post does not degrade with volume in this range, and the day totals do not flatten (4-post days: median 17,513 day reach; 3-post days: 13,370).

---

## 2. What actually drives followers

Over the 28 days originally measured (12 Aug–8 Sep):

- 4 posts out of 77 (5.2%) exceeded 20k reach. Those 4 delivered **59% of all reach and 94% of all follows.**
- **Two posts delivered 91.7% of all follows.**
- 70% of individual posts produced zero follows. The median post produces zero followers.
- Ex-breakout, the whole account converts at **0.22 follows per 1k reach** — effectively nothing.

Full-year confirmation (section 0.5): 69.0% zero-follow posts, 87.8% of follows from breakouts, 0.273 ex-breakout follows/1k. Same shape, independently.

The account does not grow steadily. It grows in jumps. Optimizing the median post for follows is optimizing a number that is structurally zero.

### The topic razor, corrected — and now reconfirmed (section 0.5)

The earlier read said health & science converts at 2.0 follows/1k vs 1.0 for animals. Measured again on this window with the breakouts removed, the gap nearly disappears: health & science 0.43, animals 0.31, kids/education 0.18, other 0.06, environment 0.00.

The razor is real, but it operates one level up. Look at the four breakouts:

| Post | Reach | Follows | Follows/1k |
|---|---|---|---|
| Antiviral Chewing Gum Cuts Risk of Head and Neck Cancers to Almost Zero | 264,513 | 764 | **2.89** |
| Woman Can See Again After World's First Transplant of a Central Retina | 118,834 | 235 | **1.98** |
| 22-yo with Down Syndrome Becomes Certified Fitness Instructor | 37,426 | 8 | 0.21 |
| Zion Becomes First National Park to Get All-Terrain Wheelchair | 26,771 | 15 | 0.56 |

**Corrected rule: any subject can win the reach lottery. Only health and science breakouts convert that reach into followers — at roughly 4–10x the rate of a non-health breakout of comparable size.** The full-year set (section 0.5) puts this at 83.6% of breakout-follows from 33% of breakouts, independently.

Practical consequence: health & science posts are not better on average, they are better *when they hit*. Feeding more of them into the feed raises the expected value of the breakout you are eventually going to catch. Keep animals in rotation — they win reach, and reach is sellable inventory even when it does not convert. **As of 12 Sep 2026 this is enforced in code**, not just policy — see `src/scoring.js`.

---

## 3. Sourcing filter

**As of 12 Sep 2026, this section's SCORE formula is superseded by `harold/src/scoring.js` — see 0.5.**
The rubric below is kept for reference; the live weighting is `TOPIC*2 + SHAPE + SPECIFICITY`, not the
flat sum shown here, because TOPIC is the only signal with confirmed evidence behind it.

Score every RSS item before queueing. Ship the highest scores first when the queue is over-full; **never let scoring reduce daily output below the N2 floor** — a 4-point item published beats a 9-point item held.

```
SCORE = TOPIC + SHAPE + SPECIFICITY   (superseded — code uses TOPIC*2 + SHAPE + SPECIFICITY)
```

**TOPIC (0–5)**
- 5 — Health, medicine, clinical result, drug approval, treatment, brain/sleep/cancer/vision
- 4 — Hard science: research finding, discovery, astronomy, biology, materials
- 3 — Animals & pets (reach engine — hold at ~25% of the queue, do not starve)
- 2 — Kids, education, human interest, kindness
- 1 — Environment, infrastructure, policy
- 0 — Horoscopes, obituaries, listicles, weekly columns → **skip entirely**

Horoscope posts in this window: 1,324 and 1,051 reach — the lowest and fourth-lowest of 77 posts.
**As of 12 Sep 2026 these are actually filtered** (`fetch.js`'s `RECURRING_FEATURE_PATTERNS`) — until
this fix, the filter's own code comment claimed horoscopes were caught and they were not.

**SHAPE (0–3)** — does the headline read as a *completed result*?
- 3 — A thing happened and it is finished: "Cuts Risk … to Almost Zero", "Can See Again After", "Approves First Drug That"
- 1 — A thing is in progress or being attempted: "Aims for", "Could Become", "Takes Big Step Towards"
- 0 — A scene is being described with no outcome: "Beating the Heat With a Million Blooming Sunflowers"

**SPECIFICITY (0–2)**
- 2 — A concrete magnitude a reader can picture: "Doubling Lifespan", "3,000 Frogs", "$1 Million"
- 0 — Vague scale: "Incredible Numbers", "Amazing", "Massive"

Caveat, stated honestly: on this sample the SHAPE and SPECIFICITY splits do **not** separate cleanly ex-breakout (n=73 is too small, and the effect lives in the tail where there are only 4 observations). They are carried forward because both top converters have them and because they cost nothing to apply. Treat sections 1 and 2 as evidence; treat SHAPE and SPECIFICITY as a hypothesis under test, and report on them in the weekly loop. **This is exactly why the live code weights TOPIC double and does not let SHAPE/SPECIFICITY outvote it (0.5 above).**

---

## 4. Caption & overlay rules

1. **Overlay text = the article headline, verbatim or trimmed.** Do not rewrite it into a scene.
2. Front-load the *result* in the first 6 words. "FDA Approves Drug That's Doubling Lifespan" — not "For anyone who's watched pancreatic cancer…"
3. Body copy: 2–3 sentences, second person, name the stake for the reader.
4. Close with `🔗 Full story — link in bio.`
5. Hashtags: keep the current fixed block. It is not a lever; do not spend cycles on it.
6. **No em-dashes in copy Harold generates.**

(Harold's actual copy constitution lives in `harold/src/editorial.js` — see that file's header comment
for the full, currently-shipping ruleset, including the shareability rule added 27 Jul 2026.)

---

## 5. Timing

Post at natural minutes across four windows. Evening is the only timing effect that survives removing the outlier post:

| Window (ET) | Median reach, ex-breakout |
|---|---|
| Before 11am | 2,643 |
| 11am – 2pm | 2,630 |
| 2pm – 6pm | 3,108 |
| **6pm and later** | **3,555** |

Weight the 4-post day as: 1 morning, 1 midday, 1 afternoon, **1 in the 6–9pm ET block**, and put the highest-scoring item of the day in the evening slot. **As of 12 Sep 2026 this is live code**, not just guidance — `run.js` computes the current slot from America/Chicago wall-clock time and `editorial.js`'s `pickArticle` holds the top-scored candidate out of non-evening slots so it naturally lands in the 6pm+ run. Harold's own 9 breakout timestamps corroborate the window independently: a disproportionate share cluster in the 3pm–6pm+ range even before this mechanism existed.

This is a **+35% median effect, not a follower effect.** The earlier "post in the evening for followers" finding did not survive and must not be reintroduced.

Note on data handling: **the Meta export timestamps are Pacific. Add 3 hours for ET.** Every timing conclusion in this file is already converted.

---

## 6. The weekly self-improvement loop

Run every Monday. This is the loop; the sections above are its current output.

### Inputs
- `data/instagram.csv` — Meta content export, Instagram, trailing 28 days
- `data/facebook.csv` — Meta content export, Facebook, trailing 28 days
- `harold_log.jsonl` — Harold's own post/skip log
- `HAROLD.md` — this file
- `INCIDENTS.md` — confirmed root causes of past dark/degraded days (added 12 Sep 2026)

### Step 1 — Integrity check (runs before anything else)

Compute, from the IG export:
- posts per calendar day for the last 28 days
- count of dark days
- posts/day for the trailing 7 vs the prior 7

**If dark days > 0, or trailing-7 posts/day < 4: stop. Do not analyze content. Open a P0 and diagnose the pipeline** — RSS fetch failure, auth expiry, rate limit, queue starvation, scheduler drift. Write the root cause into `INCIDENTS.md`.

Rationale: every large decline in this account's history has been an output failure, and every time it was initially misread as a content problem.

### Step 2 — Fixed metric panel

Compute and append one row to `harold_metrics.csv`:

```
week_ending, posts, posts_per_day, dark_days,
reach_total, reach_per_day, reach_median_per_post,
follows_total, follows_per_day, follows_per_1k_reach,
breakout_count (reach > 20000), breakout_rate,
follows_from_breakouts_pct,
reach_median_ex_breakout, follows_per_1k_ex_breakout,
zero_follow_post_pct, engagement_rate_on_reach
```

Always report **ex-breakout medians alongside totals.** A single breakout moves every total by an order of magnitude and makes week-over-week totals meaningless on their own. Current reference values (full year, section 0.5): median reach/post varies 2,186–3,296 by phase; ex-breakout follows/1k ranges 0.273–0.814 by phase (Harold is the *lowest*, not highest — don't let totals hide this); breakout rate ~2.6–5.6% by phase; zero-follow posts 56–69%. **Follows totals reported this way are a floor** — see the CSV-vs-dashboard reconciliation gap in section 0.5 before treating a per-post sum as the true follower count.

### Step 3 — Attribution

For the week: which posts broke out, what topic each was, and what each converted at per 1k. Update the running breakout table. **A breakout with fewer than 20 breakouts in the corpus is an anecdote — say so in the report rather than generalizing from it.** (Combined corpus as of 12 Sep 2026: 9 Harold breakouts + 5 Blue Lotus = 14 in the full year — still under 20; keep flagging this.)

### Step 4 — Adjust exactly one thing

Change one variable per week and name it in the report:
- daily volume (test 5/day, then 6/day)
- topic mix (raise health & science share of queue by 10 points)
- evening slot allocation
- Facebook photo lane (see section 7)

Do not change two at once. With ~5 breakouts a month there is not enough signal to attribute a change to either of two simultaneous moves. **12 Sep 2026 shipped three at once (topic weighting, evening hold, horoscope filter) because all three were separately well-evidenced and low-risk to ship together, not because this rule stopped applying — but that means next week's attribution can't cleanly separate which of the three moved any given number. Say so in the report rather than picking one to credit.**

### Step 5 — Write back

Update this file's numbers in place. Append the week's finding, the change made, and the prediction for next week to `LEARNINGS.md`. **A prediction written before the result is what makes the next loop worth running.**

### Definition of Done for the weekly loop
- [ ] Integrity check ran and dark days = 0, or a P0 is open with a named root cause
- [ ] Metric panel row appended, ex-breakout columns populated
- [ ] Breakout table updated with topic and follows/1k for each
- [ ] Exactly one variable changed, named, with a written prediction (or, if more than one shipped together, say so explicitly and flag the attribution won't be clean)
- [ ] `HAROLD.md` numbers refreshed; `LEARNINGS.md` appended

---

## 7. Facebook — the open lane

Facebook is run by a person (Andy/Andrew — Geri's son), not by Harold, for the full trailing year. Two things changed there in this window and both matter to Harold's roadmap.

**7a. The link-card lane is dead and the photo lane replaced it — confirmed on the full year, not just a narrow window.** Links: 1,041 posts (85.0% of the year), median reach 3,796. Photos: 158 posts (12.9%), median reach 5,274 — a 1.39x gap on the full year (narrower than the 2.3x seen in the shorter window this section originally cited, but the same direction). The monthly mix shows the actual migration curve: link-dominant through June 2026 (75–100+ links/month vs. single-digit photos), then a sharp flip — July 75 links/29 photos, August 14 links/61 photos, September (partial) 3 links/31 photos. This is a validated, executed win, not a hypothesis.

**7b. Facebook now beats Instagram on the typical story.** Across 44 stories that ran on both channels in the same window, the median Instagram-to-Facebook reach ratio is **0.86** — Facebook won 25 of the 44, Instagram 19. Instagram's channel-level advantage is entirely its fat tail: when Instagram wins it wins by 4x, 12x, 15x, and those few posts carry the whole comparison.

**7c. The video lane, confirmed on the full year and worse than previously known: it's not just underused, it's been dead for 4+ months.** 24 videos = 2.0% of the year's 1,224 posts, but 28.2% of all reach, median 27,722/video vs. 3,796 for links (14.6x). Monthly breakdown: videos ran Nov '25 through May '26 (1, 3, 8, 6, 5, 1 per month), then **zero from June 2026 through the September 2026 data cutoff** — a format posting over an order of magnitude the median reach of what's currently running, completely abandoned for a third of the year. This is the single highest-leverage, most quantifiable opportunity in either dataset. **Explicitly out of scope for now per Joe (12 Sep 2026)** — Harold does not do Facebook or video yet; this stays documented as the top candidate for when that changes, not an active work item.

Consequence for Harold: a Facebook photo lane is not a downgrade, and it is the single largest uncontested surface available. But Facebook is drifting the same way Instagram did before — watch posts/day and dark-day count there the same way section 1 watches Instagram, before adding anything new.

---

## 8. What this file must not claim

Guardrails against re-deriving findings that already failed:

- **"Post in the evening to get followers."** Dead. Removing one post collapses the effect. Evening is a median-reach tweak. (This is *why* the evening-hold mechanism shipped 12 Sep 2026 targets reach, not follows — don't let a future loop iteration reframe it as a follower play.)
- **"Engagement rate is the quality metric."** The agency beat Harold on engagement rate and lost on every monthly total. Rate is a per-post statistic in a business where volume swamps rate. **The full-year phase table (0.5) is the sharpest version of this yet: Harold's own ex-breakout conversion rate is the worst of the three managed eras. Total follows still favor Harold because of breakout frequency, not per-post quality. Keep saying both halves of this out loud.**
- **"Instagram is ~3x Facebook."** True in totals, false story-for-story (0.86 median ratio). Both statements need to be said together or neither should be said.
- **"Health & science converts 4x."** Only in the tail. Ex-breakout the gap is 0.43 vs 0.31. (Full-year tail number: 83.6% of breakout-follows from 33% of breakouts — the tail effect is real and large; the ex-breakout gap staying small is *also* real. Both stand.)
- **Any conclusion drawn from fewer than ~20 breakouts.** The corpus has 4 in the original window, 14 across the full year. Say "n=14" out loud in the report, not "n=4" — but still say it.
- **"Harold converts better than the agency did."** Section 0.5 shows the opposite, ex-breakout. Do not let total-follows numbers imply a per-post quality claim that the like-for-like data contradicts.

---

## 9. Known gaps

- **Link clicks: CLOSED for Facebook as of the 12 Sep 2026 full-year export** — the "Link Clicks" column exists and reconciles reasonably against the account-level dashboard (69.4K dashboard vs. 75.8K CSV-summed — close enough to trust directionally, gap likely a date-boundary or definitional difference). Still not present in the Instagram export.
- **Net follower count over time is NOT in either export.** Both are post-level content exports; account-level Follows totals (Results tab) are gross gained-follows, not gains-minus-unfollows. To settle "only Harold's tenure grew the account" as a *net* claim rather than a well-supported inference from chart shape, pull the Audience tab's followers-over-time series specifically.
- **Stories never appear in a Meta content export.** They are invisible to this loop.
- **Zero paid** across the window — boosted reach is 0 on every Facebook row. All of this is organic.
- **Harold's real monthly cost** is an estimate ($75/mo). Confirm it before it appears in any external deck.
- **The account-level Follows-vs-per-post-Follows-sum gap (section 0.5) is itself a known gap** as of 12 Sep 2026 — every follows number in sections 1, 2, and 6 above is a per-post-attribution floor, not the true total, for every phase.
