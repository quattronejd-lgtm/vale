// scripts/check-facebook-access.js — read-only: does Harold's existing token
// already have permission to post to the GNN Facebook Page?
//
// Posts nothing, changes nothing. Answers one question before any Facebook
// cross-post code gets written: is this a same-day build, or does it need a
// permission added in the Meta App Dashboard first (same mechanical fix as
// every prior token issue — pages_manage_posts is a checkbox, not a rebuild).
// Always exits 0; this is informational, never a release gate.
import { requireFacebookAccess } from "../src/publish.js";

try {
  const report = await requireFacebookAccess();
  console.log(
    `[facebook-access] token flavor=${report.flavor}` +
      (report.pageId ? ` pageId=${report.pageId} pageName=${JSON.stringify(report.pageName)}` : "")
  );
  console.log(`[facebook-access] granted scopes: ${report.grantedScopes.join(", ") || "(none returned)"}`);
  if (report.canPost) {
    console.log(
      "[facebook-access] OK — pages_manage_posts is granted. A Facebook cross-post can ship with zero new credentials."
    );
  } else {
    console.log(
      `::warning::Facebook posting is NOT yet authorized — missing: ${report.missingScopes.join(", ")}. ` +
        `Add these to the token's permissions in the Meta App Dashboard (same flow used for prior IG token work) before any Facebook cross-post goes live.`
    );
  }
} catch (err) {
  console.log(`::warning::Facebook access check failed to run (${err.message}).`);
}
