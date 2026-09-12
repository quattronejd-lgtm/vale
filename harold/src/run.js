// run.js — orchestrate fetch → editorial → render → publish, one post per run.
//
// SAFETY: dry-run is the DEFAULT. Nothing is posted unless you pass --live.
//   node src/run.js            # dry-run: fetch+editorial+render, print caption
//   node src/run.js --dry-run  # same, explicit
//   node src/run.js --live     # actually publish to Instagram
import { fetchArticles, markPosted, DEFAULT_LEDGER } from "./fetch.js";
import { pickArticle, pickOrangeWords, writeSpotlightHeadline, writeCaption } from "./editorial.js";
import { scoreArticle } from "./scoring.js";
import { vetHero } from "./hero.js";
import { render, SPOTLIGHT_TEMPLATE } from "./render.js";
import { publishCard, publishStory } from "./publish.js";
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

const SLOTS = new Set(["morning", "midday", "afternoon", "evening"]);

/** Which of the 4 daily posting windows this run falls in, America/Chicago wall clock. */
function currentSlot(now = new Date()) {
  const override = (process.env.HAROLD_SLOT || "").trim().toLowerCase();
  if (SLOTS.has(override)) return override;
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", hour12: false }).format(now)
  );
  if (hour < 11) return "morning";
  if (hour < 14) return "midday";
  if (hour < 17) return "afternoon";
  return "evening";
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
  const slot = currentSlot();
  console.log(`[run] slot: ${slot}`);
  const items = await fetchArticles({ limit: 5 });
  const article = pickArticle(items, { slot });
  if (!article) {
    console.log("[run] no unposted articles — nothing to do.");
    return { status: "empty" };
  }
  console.log(`[run] article: ${article.title}`);
  console.log(`[run] link:    ${article.link}`);
  if (!article.heroImage) {
    throw new Error("[run] selected article has no hero image; aborting.");
  }

  // 2) editorial — Animal Spotlight template for animal/pet-topic picks
  // (approved by Joe 12 Sep 2026): short punchy on-image phrase instead of
  // the full headline, on the dedicated layout. The real article title
  // still drives the Instagram caption below the image either way — this
  // only changes what's burned into the picture.
  const isAnimalSpotlight = scoreArticle(article).topicLabel === "animals & pets";
  let headline, orangeWords, template;
  if (isAnimalSpotlight) {
    const fullHeadlineOrange = await pickOrangeWords(article.title.toUpperCase());
    headline = await writeSpotlightHeadline({ ...article, orangeWords: fullHeadlineOrange });
    orangeWords = await pickOrangeWords(headline);
    template = SPOTLIGHT_TEMPLATE;
    console.log(`[run] Animal Spotlight template selected`);
  } else {
    headline = (article.title || "").toUpperCase();
    orangeWords = await pickOrangeWords(headline);
  }
  // Always the real article title + blurb, regardless of template -- one
  // call either way (editorialize() is NOT used here specifically to avoid
  // calling writeCaption twice).
  const caption = await writeCaption(article);

  // 2b) photo-editor gate: judge the hero, maybe substitute stock
  const hero = await vetHero({ heroImage: article.heroImage, title: article.title });

  // 3) render
  const rendered = await render({
    heroImage: hero.url,
    headline,
    orangeWords,
    out: OUT,
    template,
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

  // 5) cross-post to Stories (best-effort): the feed post above is the one
  // that matters and has already succeeded and been logged to the ledger by
  // this point, so a Stories failure is logged and swallowed, never thrown
  // -- it must not turn a successful post into a failed run.
  let storyMediaId = null;
  try {
    const story = await publishStory({ imageUrl });
    storyMediaId = story.mediaId;
  } catch (err) {
    console.warn(`[run] story cross-post failed (feed post already succeeded): ${err.message}`);
  }

  return { status: "posted", mediaId, storyMediaId, article };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
