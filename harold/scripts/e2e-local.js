// e2e-local.js — prove the full run.js chain (fetch → editorial → render)
// without external network: serves a mock GNN RSS feed + hero image on
// localhost, points HAROLD_FEED_URL at it, and runs a dry-run.
//
// Also verifies the posted.json ledger: after marking the item posted, a
// second fetch must return nothing.
//
// Usage: node scripts/e2e-local.js
import http from "node:http";
import { readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HERO = path.resolve(__dirname, "egypt-hero.jpg");
const LEDGER = path.resolve(__dirname, "../out/e2e-ledger.json");

const feedXml = (base) => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
  <title>Good News Network (mock)</title>
  <item>
    <title>Egypt: The Windiest Country Starts Project to Power 6 Million Homes</title>
    <link>${base}/article/egypt-wind</link>
    <guid>${base}/article/egypt-wind</guid>
    <media:content url="${base}/hero.jpg" medium="image" />
    <description>A massive new wind farm in the Gulf of Suez will generate clean power for six million homes.</description>
  </item>
</channel>
</rss>`;

const server = http.createServer(async (req, res) => {
  if (req.url === "/feed/") {
    res.writeHead(200, { "Content-Type": "application/rss+xml" });
    res.end(feedXml(`http://127.0.0.1:${server.address().port}`));
  } else if (req.url === "/hero.jpg") {
    res.writeHead(200, { "Content-Type": "image/jpeg" });
    res.end(await readFile(HERO));
  } else {
    res.writeHead(404);
    res.end();
  }
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
console.log(`[e2e] mock feed at ${base}/feed/`);

try {
  await rm(LEDGER, { force: true });
  process.env.HAROLD_FEED_URL = `${base}/feed/`;

  // Import AFTER setting the env var (fetch.js reads it at module load).
  const { fetchArticles, markPosted } = await import("../src/fetch.js");
  const { editorialize } = await import("../src/editorial.js");
  const { render } = await import("../src/render.js");

  // 1) fetch
  const items = await fetchArticles({ limit: 5, ledgerPath: LEDGER });
  if (items.length !== 1) throw new Error(`expected 1 item, got ${items.length}`);
  const article = items[0];
  console.log(`[e2e] fetched: ${article.title}`);
  if (!article.heroImage?.endsWith("/hero.jpg")) {
    throw new Error(`hero not resolved from media:content: ${article.heroImage}`);
  }

  // 2) editorial
  const { headline, orangeWords, caption } = await editorialize(article);
  if (orangeWords.length !== 1) throw new Error("single-span rule violated");
  console.log(`[e2e] orange span: ${JSON.stringify(orangeWords)}`);

  // 3) render (hero fetched over HTTP from the mock server)
  const out = path.resolve(__dirname, "../out/e2e-card.jpg");
  const r = await render({ heroImage: article.heroImage, headline, orangeWords, out });
  console.log(`[e2e] rendered ${r.path} (${r.width}×${r.height})`);
  console.log(`[e2e] caption:\n${caption}\n`);

  // 4) ledger: mark posted → second fetch returns nothing
  await markPosted({ ...article, postedAt: "e2e" }, LEDGER);
  const again = await fetchArticles({ limit: 5, ledgerPath: LEDGER });
  if (again.length !== 0) throw new Error("ledger failed: item repeated");
  console.log("[e2e] ledger dedupe OK (second fetch: 0 items)");

  console.log("[e2e] PASS");
} finally {
  server.close();
  await rm(LEDGER, { force: true });
}
