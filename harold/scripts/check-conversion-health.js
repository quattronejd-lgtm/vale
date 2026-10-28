// scripts/check-conversion-health.js — alarm on CONVERSION, not output.
//
// The Oct 2026 audit's single clearest finding about Harold: output held
// steady at 21-24 posts/week through a six-week collapse in follows-per-10k-
// reach (22 -> 1) that started ~10 Aug, and the output-floor monitoring
// Harold already has would have read green through the entire thing. This
// is the fix that audit explicitly asked for: "alarm on follows per 10k
// reach and median reach per post, not on post count."
//
// BLOCKED today: needs the instagram_manage_insights permission, which has
// never been added to Harold's token (flagged in HAROLD_SPEC.md section 7
// since Sep, still open). Running this now will log a clear permission
// error and exit 0 -- never blocks a post. Once the permission is added,
// this starts actually alarming with no further code changes needed.
import { checkConversionHealth } from "../src/publish.js";

// A floor, not a tuned threshold: the audit measured a 22x collapse (22 ->
// 1) over six weeks, so "less than half of the prior window" catches that
// kind of move early without chasing single-day noise. Revisit once a few
// real cycles of data exist.
const ALARM_RATIO = 0.5;

try {
  const report = await checkConversionHealth();
  console.log(
    `[conversion-health] follows/10k reach — prior 7d: ${report.olderFollowsPer10kReach?.toFixed(2) ?? "n/a"}, ` +
      `recent 7d: ${report.recentFollowsPer10kReach?.toFixed(2) ?? "n/a"} ` +
      `(recent net followers: ${report.recentNetFollowers}, recent reach: ${report.recentReach})`
  );

  if (report.olderFollowsPer10kReach && report.recentFollowsPer10kReach !== null) {
    const ratio = report.recentFollowsPer10kReach / report.olderFollowsPer10kReach;
    if (ratio < ALARM_RATIO) {
      console.log(
        `::error::Harold's follow conversion is collapsing: follows/10k reach fell from ` +
          `${report.olderFollowsPer10kReach.toFixed(2)} to ${report.recentFollowsPer10kReach.toFixed(2)} ` +
          `(${Math.round(ratio * 100)}% of the prior week) while output kept running. This is the exact ` +
          `failure mode the Oct 2026 audit found — diagnose sourcing/copy, not the pipeline's uptime.`
      );
    } else {
      console.log("[conversion-health] OK");
    }
  } else {
    console.log("[conversion-health] insufficient data for a ratio this run");
  }
} catch (err) {
  console.log(
    `::warning::Conversion-health check could not run (${err.message}). If this is a permission error, ` +
      `instagram_manage_insights needs to be added to Harold's token in the Meta app dashboard — see HAROLD.md.`
  );
}
