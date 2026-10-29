# INCIDENTS.md — Harold outage log

Format per HAROLD.md's integrity-check step: every dark day or output drop
gets a root cause here, not a guess. "Every large decline in this account's
history has been an output failure, and every time it was initially misread
as a content problem" — this file is what makes that check backward-looking
instead of hypothetical next time.

---

## 2026-07-22 → 2026-07-25 — Netlify auth failure (2 full dark days)

**Impact:** 2026-07-22 dropped to 1 post (normally 4); 2026-07-23 and
2026-07-24 were fully dark (0 posts, 0 of any kind — not late, not skipped
by design, just absent). Confirmed independently in the Meta export: the
ledger's last successful post before the gap was 2026-07-22T07:57:56Z, and
every scheduled run in between shows `conclusion: failure`.

**Root cause:** every failing run reached all the way through fetch →
editorial → hero image → render → caption — i.e. the whole pipeline worked —
and then died at the exact same line, every time:

```
Error: publish: Netlify POST /sites/1536eb41-70ea-4b6b-aa6f-54f404810ba9/deploys failed 401 {"code":401,"message":"Access Denied"}
    at netlify (harold/src/publish.js:131:11)
```

`NETLIFY_AUTH_TOKEN` had stopped authenticating. Instagram's Graph API can
only ingest a public image URL, so a broken Netlify deploy means the whole
post fails downstream of it — a credentials problem masquerading as "Harold
is broken," same misdiagnosis pattern this incident log exists to prevent.

**Why it went unnoticed for ~3 days:** no preflight credential check
existed at the time, and GitHub's default per-run failure emails were the
only signal — easy to miss or tune out across a busy weekend.

**Fix:** rotated the Netlify personal access token (Netlify dashboard →
User settings → Applications → Personal access tokens → generate new →
updated repo secret `NETLIFY_AUTH_TOKEN`), then manually triggered a live
`workflow_dispatch` run to confirm and catch up rather than wait for the
next scheduled slot. Ledger shows the catch-up post at 2026-07-25T13:36:43Z.

**Follow-up shipped:** none at the time for Netlify specifically (no
equivalent non-mutating health-check endpoint was investigated for
Netlify). What *did* ship afterward, for the separate-but-related "the
pipeline silently doesn't run at all" failure mode: a `repository_dispatch`
backstop (external clock, independent of GitHub Actions' own scheduler) and
a staleness cap on the DST-twin guard, addressing two related-but-distinct
ways a day can go dark. This incident is the reason those exist — see
`.github/workflows/harold-daily.yml` guard step comments for the timeline.

**Prediction for next time:** an expired/revoked API credential is the most
likely single cause of a future dark day, more likely than a content or
scheduling bug — Harold's actual code has not been the cause of a dark day
yet. The IG token health preflight (`scripts/check-token-health.js`,
added 2026-09-10) exists to catch the same failure mode one level up the
credential stack, before it costs a day rather than after.

---

## 2026-08-10 → 2026-10-28 — Follow conversion collapse while output looked healthy (six-week decay, caught by an external audit, not by Harold)

**Impact:** no dark day, no output drop — 21–24 posts/week held steady the
entire time, which is exactly why nothing in Harold's own monitoring ever
fired. Follows per 10k reach fell 22 → 14 → 10 → 4 → 1 over six weeks
starting ~10 Aug; median reach per post fell from 3,301 to 1,577 over the
same window (per the GNN Distribution Map audit, Meta export analysed
9 Sep + later data through 24 Oct). The week of 19 Oct produced 17 follows
against 787 in the week of 10 Aug — on comparable output and comparable
reach for part of that window.

**Root cause:** not confirmed, only a strong single-candidate hypothesis —
said plainly because HAROLD.md's own rule is to say so rather than fill in
a plausible-sounding cause. `git log` shows exactly one Harold prompt/code
change in the two weeks before the decay started: commit `d3c6275`
(2026-08-05), "bake shareability into the copy constitution," which
reframed the Instagram blurb as something written to be forwarded to one
specific person (shares carry more algorithmic weight than likes) rather
than as the account's own voice. That trade is plausible on its face — a
caption written as a private message between two people gives a
non-follower who receives the share less reason to follow the account that
sent it, even as it still earns a share. The timing fits: median reach
briefly *rose* mid-window (3,068 → 3,555, 26 Aug–8 Sep, per HAROLD.md's own
prior analysis) while conversion kept falling — the signature of more
sharing, not less reach. No other Harold change exists in this window to
blame instead.

**Why it went unnoticed for ~11 weeks:** Harold's only self-monitoring was
an output floor (did a post go out) and token liveness — neither one reads
conversion. The external audit that caught this had something Harold
doesn't: Meta's manual CSV export with a `follows` column. Harold has never
had `instagram_manage_insights` permission to see any version of this
number itself (flagged as an open gap in HAROLD_SPEC.md §7 since
September, never granted).

**Fix:** reverted the Aug 5 shareability framing in
`harold/src/editorial.js` (copy-constitution comment, `BLURB_PROMPT`, and
the related line in the orange-span `PROMPT`) back to the pre-Aug-5
wording, as a live test of the hypothesis rather than a claimed proof.
Nothing else about the pipeline changed, so if conversion recovers in the
following weeks, this was it; if it doesn't, the real cause is still open
and the next candidate is whatever happened on the platform side, not
Harold's own prompt.

**Follow-up shipped:** `src/publish.js` now has `getAccountInsights()` and
`checkConversionHealth()`, wired into a new
`scripts/check-conversion-health.js` step in `harold-daily.yml`, alarming
when recent follows-per-10k-reach (via net `follower_count`, the closest
proxy the public Graph API exposes without Meta's gross `follows` export)
drops below half of the prior week. **This cannot actually alarm yet** —
it needs the same `instagram_manage_insights` permission the root-cause
diagnosis above couldn't get either, so today it only logs a clean
`::warning::` naming the missing permission. The code is ready the moment
that permission is added; nobody has to remember to come back and write it
then.

**Prediction for next time:** if the shareability revert is the real fix,
follows-per-10k-reach should visibly recover within 1-2 weeks of posts
under the reverted copy. If it doesn't recover, the hypothesis is wrong and
the actual cause is still open — in that case, look at the audit's other
flagged unknown for this exact window ("why Instagram went dark in May and
June" is a different gap, but the same audit's "what changed around 10
August" is listed as the single most time-sensitive open question on the
whole map) before assuming it's unknowable.

---

## 2026-10-28T02:08:52Z → 2026-10-29T18:41Z — Self-inflicted full dark period, ~40.5 hours (the worst outage in this project's history)

**Impact:** zero live posts for ~40.5 hours — confirmed via `data/posted.json`'s last entry before the
gap (2026-10-28T02:08:52Z) and the live catch-up run that broke it (2026-10-29T18:42:13Z). Every
scheduled run in between that reached the live publish step failed outright (`conclusion: failure`,
visible in Actions run history, not hidden the way the Sep 2026 staleness-cap incident was) — runs
881/878/876/874 among them. The alternating success/failure pattern in that history is the DST-twin
guard's *other* twin correctly skipping its non-matching slot each time, not evidence the posting
pipeline was intermittently healthy.

**Root cause:** caused directly by rotating `IG_ACCESS_TOKEN` to a facebook-login (EAA) token on 28 Oct
2026 to add Facebook cross-posting (see §6.5 above). `igUserId()` in `publish.js` — the function that
resolves which Instagram account to post to, called on **every** live run regardless of whether the
Facebook feature is even enabled — has a facebook-login branch that calls `/me/accounts` to find the
Page/IG linkage. That endpoint returns `{"data":[]}` for this account even when `debug_token` confirms
the token genuinely carries `pages_manage_posts` scoped exactly to GNN's Page (first noticed and worked
around for the *new, optional* Facebook functions — `requireFacebookAccess()`, then-named
`facebookPageId()` — but `igUserId()` predates that work and was never touched, so the one function
every single live post actually depends on kept failing with no fallback). Working theory for why
`/me/accounts` behaves this way at all: GNN's Page is a Business Portfolio asset, and `/me/accounts`
only enumerates plain, personally-administered Pages.

**Why it went unnoticed for so long:** it wasn't silent — every failing run shows `conclusion: failure`
in Actions, which is more visible than several earlier incidents in this log. It went unnoticed because
nobody (including the agent that caused it) checked the live run history after enabling the feature
until directly asked "is it working" roughly 21 hours in. The token-health and Facebook-access
preflight checks both passed on every failing run — they confirm the token is valid and scoped, not
that the actual posting call succeeds, so they gave false reassurance. This is the same category of
gap HAROLD.md §0.6 already flagged for conversion monitoring: a check that validates the wrong layer
reads green while the thing that matters is broken.

**Fix:** routed `igUserId()`'s facebook-login branch through the same `resolveFacebookPage()` fallback
(direct Page-id fetch when `/me/accounts` comes back empty) already built for the Facebook-specific
functions. Verified via a live `workflow_dispatch` catch-up run immediately after the fix: Instagram
posted successfully (media `18139619686626932`). A second, separate bug surfaced in the same run —
Facebook's own cross-post failed with a misleading "publish_actions deprecated" error, actually caused
by posting with the user token instead of the Page's own access token — fixed immediately after in the
same session; see the next entry once confirmed live.

**Follow-up shipped:** none yet beyond the direct fix. The real follow-up is procedural, not code: a
credential-flavor change (instagram-login → facebook-login) is exactly the kind of change that should
have triggered a full live catch-up run and a run-history check immediately after shipping, the same
discipline already applied to every prior token rotation in this log — that discipline lapsed here
specifically because the change was framed as "adding a feature" rather than "changing a credential,"
and the two were in fact the same commit.

**Prediction for next time:** any future change to `IG_ACCESS_TOKEN`'s flavor or scopes needs an
immediate live verification run and a run-history check before being considered done, independent of
whether the change was motivated by a new feature or a routine rotation. A passing preflight check
(token-health, Facebook-access) is necessary but not sufficient evidence that posting itself works.

---

## Template for the next entry

```
## YYYY-MM-DD → YYYY-MM-DD — <one-line description>

**Impact:** <dark days, degraded days, reach/follows cost if known>
**Root cause:** <confirmed cause with evidence — logs, run IDs, error text —
  not a guess. If genuinely undiagnosed, say so explicitly rather than
  filling in a plausible-sounding cause.>
**Why it went unnoticed:** <detection gap, if any>
**Fix:** <what was actually done>
**Follow-up shipped:** <any structural change made so this class of failure
  is caught earlier next time, or "none yet">
**Prediction for next time:** <per HAROLD.md's own rule — a prediction
  written before the next result is what makes the loop worth running>
```
