// fetch.js — pull latest articles from GNN's RSS feed.
//
// Public API:
//   fetchArticles({ feedUrl, limit, ledgerPath }) -> [{ title, link, heroImage, excerpt, guid }]
//   isPosted(link, ledgerPath) / markPosted(link, ledgerPath)
//
// Returns the newest N *unposted* items, using a small posted.json ledger so
// nothing repeats. Hero image resolves from media:content -> enclosure ->
// media:thumbnail -> the article's og:image.
import Parser from "rss-parser";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// HAROLD_FEED_URL overrides the feed for staging/testing.
export const DEFAULT_FEED =
  process.env.HAROLD_FEED_URL || "https://www.goodnewsnetwork.org/feed/";
export const DEFAULT_LEDGER = path.resolve(__dirname, "../data/posted.json");

const parser = new Parser({
  headers: { "User-Agent": "HaroldBot/0.1 (+GNN Instagram pipeline)" },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
      ["content:encoded", "contentEncoded"],
    ],
  },
});

function firstUrl(arr) {
  if (!arr) return null;
  for (const node of Array.isArray(arr) ? arr : [arr]) {
    const url = node?.$?.url || node?.url;
    if (url) return url;
  }
  return null;
}

/** Pull og:image from an article page as a last-resort hero. */
async function fetchOgImage(articleUrl) {
  try {
    const res = await fetch(articleUrl, {
      headers: { "User-Agent": "HaroldBot/0.1" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/** Strip WordPress size suffixes (…-300x225.jpg) to get the original file. */
function stripWpSize(url) {
  return url.replace(/-\d{2,4}x\d{2,4}(?=\.(?:jpe?g|png|webp|gif)(?:$|[?#]))/i, "");
}

/**
 * Best-effort hero image extraction for one feed item. The article page's
 * og:image (the full-size featured image) beats RSS variants, which are
 * often small thumbnails or odd crops; among media:content entries prefer
 * the widest.
 */
async function resolveHero(item) {
  const og = item.link ? await fetchOgImage(item.link) : null;
  if (og) return stripWpSize(og);

  const media = (Array.isArray(item.mediaContent) ? item.mediaContent : [])
    .map((n) => ({ url: n?.$?.url, w: Number(n?.$?.width) || 0 }))
    .filter((c) => c.url)
    .sort((a, b) => b.w - a.w);
  if (media[0]) return stripWpSize(media[0].url);

  const fallback =
    item.enclosure?.url ||
    firstUrl(item.mediaThumbnail) ||
    item.contentEncoded?.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ||
    null;
  return fallback ? stripWpSize(fallback) : null;
}

// GNN's feed mixes real stories with recurring daily features ("Good News in
// History, July 15", quote/horoscope-style roundups). Cards should only be
// made from actual news stories — skip the features.
const RECURRING_FEATURE_PATTERNS = [
  /good news in history/i,
  /quote of the day/i,
  /morning journey/i,
  /good news roundup/i,
];

export function isRecurringFeature(title = "") {
  return RECURRING_FEATURE_PATTERNS.some((re) => re.test(title));
}

/**
 * COPY RULE: excerpts end at sentence boundaries — never a mid-thought "…".
 * Accumulate whole sentences up to ~max chars; hard word-boundary trim only
 * if even the first sentence is colossal.
 */
function firstSentence(html = "", max = 300) {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const sentences = text.match(/[^.!?]+[.!?]+["'”’]?/g);
  if (!sentences) {
    return text.length > max ? text.slice(0, max).replace(/\s+\S*$/, "") + "…" : text;
  }
  let out = "";
  for (const s of sentences) {
    const next = out ? `${out} ${s.trim()}` : s.trim();
    if (out && next.length > max) break;
    out = next;
    if (out.length >= max) break;
  }
  if (out.length > max * 1.5) {
    return out.slice(0, max).replace(/\s+\S*$/, "") + "…";
  }
  return out;
}

// ---- ledger ----
async function readLedger(ledgerPath) {
  if (!existsSync(ledgerPath)) return { posted: [] };
  try {
    return JSON.parse(await readFile(ledgerPath, "utf8"));
  } catch {
    return { posted: [] };
  }
}

export async function isPosted(link, ledgerPath = DEFAULT_LEDGER) {
  const led = await readLedger(ledgerPath);
  return led.posted.some((p) => p.link === link);
}

export async function markPosted(entry, ledgerPath = DEFAULT_LEDGER) {
  const led = await readLedger(ledgerPath);
  if (!led.posted.some((p) => p.link === entry.link)) {
    led.posted.unshift({
      link: entry.link,
      title: entry.title,
      postedAt: entry.postedAt || null, // caller stamps time; kept deterministic-friendly
    });
    led.posted = led.posted.slice(0, 500); // cap ledger size
  }
  await mkdir(path.dirname(ledgerPath), { recursive: true });
  await writeFile(ledgerPath, JSON.stringify(led, null, 2) + "\n");
}

/**
 * Fetch newest unposted articles.
 * @returns {Promise<Array<{title,link,heroImage,excerpt,guid}>>}
 */
export async function fetchArticles({
  feedUrl = DEFAULT_FEED,
  limit = 5,
  ledgerPath = DEFAULT_LEDGER,
} = {}) {
  const feed = await parser.parseURL(feedUrl);
  const led = await readLedger(ledgerPath);
  const postedLinks = new Set(led.posted.map((p) => p.link));

  const out = [];
  for (const item of feed.items || []) {
    if (out.length >= limit) break;
    const link = item.link;
    if (!link || postedLinks.has(link)) continue;
    if (isRecurringFeature(item.title)) {
      console.log(`[fetch] skipping recurring feature: ${item.title}`);
      continue;
    }
    out.push({
      title: (item.title || "").trim(),
      link,
      guid: item.guid || link,
      heroImage: await resolveHero(item),
      excerpt: firstSentence(item.contentSnippet || item.contentEncoded || item.content),
    });
  }
  return out;
}

// CLI: node src/fetch.js  (prints newest unposted items)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const items = await fetchArticles({ limit: Number(process.argv[2]) || 5 });
  console.log(JSON.stringify(items, null, 2));
}
