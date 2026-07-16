// run.js — orchestrate fetch → editorial → render → publish, one post per run.
//
// SAFETY: dry-run is the DEFAULT. Nothing is posted unless you pass --live.
//   node src/run.js            # dry-run: fetch+editorial+render, print caption
//   node src/run.js --dry-run  # same, explicit
//   node src/run.js --live     # actually publish to Instagram
import { fetchArticles, markPosted, DEFAULT_LEDGER } from "./fetch.js";
import { pickArticle, editorialize } from "./editorial.js";
import { vetHero } from "./hero.js";
import { render } from "./render.js";
import { publishCard } from "./publish.js";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../out/card.jpg");

// Posting slots are hours apart; GitHub's own cron can fire the SAME slot late
// (observed up to ~30+ min) even after a manual/watchdog dispatch already
// covered it. This cooldown makes overlapping triggers a safe no-op instead
// of a duplicate post, regardless of which trigger source is "late."
const COOLDOWN_MINUTES = Number(process.env.HAROLD_COOLDOWN_MINUTES) || 60;

function parseArgs(argv) {
  const live = argv.includes("--live");
  // dry-run is the default; --live is the only way to disable it.
  return { dryRun: !live };
}

/** Minutes since the ledger's most recent post, or Infinity if there is none. */
async function minutesSinceLastPost(ledgerPath) {
  let ledger;
  try {
    ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
  } catch {
    return Infinity;
  }
  const last = ledger.posted?.[0];
  if (!last?.postedAt) return Infinity;
  return (Date.now() - new Date(last.postedAt).getTime()) / 60_000;
}

export async function main(argv = process.argv.slice(2)) {
  const { dryRun } = parseArgs(argv);
  console.log(`[run] mode: ${dryRun ? "DRY-RUN (no posting)" : "LIVE"}`);

  // Cooldown guard (live only): if something posted very recently, this is
  // almost certainly an overlapping trigger for the slot already covered
  // (e.g. GitHub's own cron firing late after a manual catch-up already ran).
  // Skip rather than post a second article for the same slot.
  if (!dryRun) {
    const sinceLast = await minutesSinceLastPost(DEFAULT_LEDGER);
    if (sinceLast < COOLDOWN_MINUTES) {
      console.log(
        `[run] last post was ${sinceLast.toFixed(1)}m ago (< ${COOLDOWN_MINUTES}m cooldown) — ` +
          `this slot looks already covered by another trigger. Skipping to avoid a duplicate post.`
      );
      return { status: "cooldown-skip", sinceLast };
    }
  }

  // 1) fetch
  const items = await fetchArticles({ limit: 5 });
  const article = pickArticle(items);
  if (!article) {
    console.log("[run] no unposted articles — nothing to do.");
    return { status: "empty" };
  }
  console.log(`[run] article: ${article.title}`);
  console.log(`[run] link:    ${article.link}`);
  if (!article.heroImage) {
    throw new Error("[run] selected article has no hero image; aborting.");
  }

  // 2) editorial
  const { headline, orangeWords, caption } = await editorialize(article);

  // 2b) photo-editor gate: judge the hero, maybe substitute stock
  const hero = await vetHero({ heroImage: article.heroImage, title: article.title });

  // 3) render
  const rendered = await render({
    heroImage: hero.url,
    headline,
    orangeWords,
    out: OUT,
  });
  console.log(`[run] rendered ${rendered.path} (${rendered.width}×${rendered.height})`);

  console.log("\n--------- CAPTION ---------\n" + caption + "\n---------------------------\n");

  if (dryRun) {
    console.log(`[run] DRY-RUN complete. Eyeball ${rendered.path}. Nothing posted.`);
    return { status: "dry-run", article, headline, orangeWords, caption, out: rendered.path };
  }

  // 4) publish (live only)
  const { mediaId, imageUrl } = await publishCard({ imagePath: OUT, caption });
  await markPosted({ ...article, postedAt: new Date().toISOString() }, DEFAULT_LEDGER);
  console.log(`[run] LIVE post complete. media=${mediaId} url=${imageUrl}`);
  return { status: "posted", mediaId, article };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
