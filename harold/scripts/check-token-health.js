// scripts/check-token-health.js — preflight for IG_ACCESS_TOKEN health.
//
// Never blocks a post on its own: a token that's actually dead will fail the
// real publish call regardless of what this reports. This exists purely to
// surface a warning BEFORE that happens — via a GitHub Actions annotation —
// so a slow-motion 60-day token expiry doesn't show up as a silent dark day
// (the exact failure mode HAROLD.md's N1 rule exists to prevent). Always
// exits 0; the annotation is the signal, not the exit code.
import { checkTokenHealth } from "../src/publish.js";

const WARN_WITHIN_DAYS = 7;

const report = await checkTokenHealth();
console.log(`[token-health] flavor=${report.flavor} valid=${report.valid} — ${report.detail}`);

if (!report.valid) {
  console.log(
    `::error::Harold's Instagram token is no longer valid (${report.detail}). Posts will fail until IG_ACCESS_TOKEN is replaced.`
  );
} else if (report.expiresInDays !== null && report.expiresInDays <= WARN_WITHIN_DAYS) {
  console.log(
    `::warning::Harold's Instagram token expires in ${report.expiresInDays} day(s). Rotate IG_ACCESS_TOKEN before it goes dark.`
  );
} else {
  console.log("[token-health] OK");
}
