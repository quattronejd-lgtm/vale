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
