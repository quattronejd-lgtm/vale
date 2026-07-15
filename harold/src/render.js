// render.js — fill the locked template and screenshot it to a 1080×1350 JPEG.
//
// Public API:
//   render({ heroImage, headline, orangeWords, out }) -> { path, width, height }
//
// Determinism: the hero image is fetched to bytes and inlined as a data URI,
// and the Anton font is bundled locally, so the same inputs produce a
// byte-stable JPEG (no network at screenshot time, no font-swap flicker).

import { launchChromium } from "./browser.js";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.resolve(__dirname, "../template/card.html");

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * Build headline innerHTML, wrapping each orange word/phrase in
 * <span class="kw">. Matching is case-insensitive, longest-phrase-first,
 * and non-overlapping. Only whole matched substrings recolor.
 */
export function buildHeadlineHTML(headline, orangeWords = []) {
  const used = new Array(headline.length).fill(false);
  const ranges = [];
  const hay = headline.toUpperCase();

  const sorted = [...orangeWords]
    .filter((w) => w && w.trim())
    .sort((a, b) => b.length - a.length);

  for (const word of sorted) {
    const needle = word.toUpperCase();
    let idx = hay.indexOf(needle);
    while (idx !== -1) {
      let free = true;
      for (let i = idx; i < idx + needle.length; i++) {
        if (used[i]) {
          free = false;
          break;
        }
      }
      if (free) {
        ranges.push([idx, idx + needle.length]);
        for (let i = idx; i < idx + needle.length; i++) used[i] = true;
      }
      idx = hay.indexOf(needle, idx + needle.length);
    }
  }

  ranges.sort((a, b) => a[0] - b[0]);

  let out = "";
  let cursor = 0;
  for (const [s, e] of ranges) {
    out += esc(headline.slice(cursor, s));
    out += `<span class="kw">${esc(headline.slice(s, e))}</span>`;
    cursor = e;
  }
  out += esc(headline.slice(cursor));
  return out;
}

/** Resolve a hero reference (http(s) URL, data: URI, or local path) to a data URI. */
async function toDataURI(ref) {
  if (!ref) throw new Error("render: heroImage is required");
  if (ref.startsWith("data:")) return ref;

  let bytes, contentType;
  if (/^https?:\/\//i.test(ref)) {
    const res = await fetch(ref, {
      headers: { "User-Agent": "HaroldBot/0.1 (+GNN card renderer)" },
    });
    if (!res.ok) throw new Error(`render: hero fetch ${res.status} for ${ref}`);
    contentType = res.headers.get("content-type") || "image/jpeg";
    bytes = Buffer.from(await res.arrayBuffer());
  } else {
    bytes = await readFile(ref);
    const ext = path.extname(ref).toLowerCase();
    contentType =
      ext === ".png" ? "image/png" :
      ext === ".webp" ? "image/webp" :
      ext === ".gif" ? "image/gif" : "image/jpeg";
  }
  // Strip any charset suffix; keep only the media type.
  contentType = contentType.split(";")[0].trim();
  return `data:${contentType};base64,${bytes.toString("base64")}`;
}

// The auto-fit routine, injected into the page. Scales #headline down from a
// large size until it fits the safe box (no width/height overflow, ≤ 5 lines),
// so 1–5 lines always fill without spilling.
function fitHeadlineInPage() {
  const el = document.getElementById("headline");
  const box = document.getElementById("headline-wrap");
  const lineHeight = 0.92; // must match .headline line-height in card.css
  const STRETCH = 1.3; // must match .headline scaleY in card.css
  const MAX = 172;
  const MIN = 40;
  const maxHeight = box.clientHeight; // capped by max-height in CSS

  let size = MAX;
  for (; size > MIN; size -= 1) {
    el.style.fontSize = size + "px";
    const overflowW = el.scrollWidth > box.clientWidth + 1;
    // scaleY doesn't affect layout; account for the visual stretch here
    const overflowH = el.scrollHeight * STRETCH > maxHeight + 1;
    const lines = Math.round(el.scrollHeight / (size * lineHeight));
    if (!overflowW && !overflowH && lines <= 5) break;
  }
  // approved taste: a hair smaller than the largest fit
  size = Math.round(size * 0.98);
  el.style.fontSize = size + "px";
  return size;
}

/**
 * Render one card.
 * @param {object} opts
 * @param {string} opts.heroImage   http(s) URL, data: URI, or local path
 * @param {string} opts.headline    plain headline text
 * @param {string[]} opts.orangeWords substrings to recolor orange
 * @param {string} opts.out         output JPEG path
 * @param {number} [opts.quality=92]
 */
export async function render({
  heroImage,
  headline,
  orangeWords = [],
  out,
  quality = 92,
}) {
  if (!headline) throw new Error("render: headline is required");
  if (!out) throw new Error("render: out path is required");

  const heroDataURI = await toDataURI(heroImage);
  const headlineHTML = buildHeadlineHTML(headline, orangeWords);

  const browser = await launchChromium();
  try {
    const page = await browser.newPage({
      viewport: { width: CARD_WIDTH, height: CARD_HEIGHT },
      deviceScaleFactor: 1,
    });

    await page.goto(pathToFileURL(TEMPLATE).href, { waitUntil: "load" });

    // Inject content.
    await page.evaluate(
      ({ hero, html }) => {
        document.getElementById("hero").src = hero;
        document.getElementById("headline").innerHTML = html;
      },
      { hero: heroDataURI, html: headlineHTML }
    );

    // Wait for hero decode + fonts before measuring/screenshotting.
    await page.evaluate(async () => {
      const img = document.getElementById("hero");
      if (!img.complete) {
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = () => rej(new Error("hero image failed to decode"));
        });
      }
      await document.fonts.ready;
      // Force-load the headline face at display size before measuring.
      const face = getComputedStyle(document.documentElement)
        .getPropertyValue("--headline-font")
        .split(",")[0]
        .trim();
      await document.fonts.load(`172px ${face}`);
    });

    const fontSize = await page.evaluate(fitHeadlineInPage);
    console.log(`[render] headline fit at ${fontSize}px`);

    const card = page.locator("#card");
    await card.screenshot({
      path: out,
      type: "jpeg",
      quality,
    });

    return { path: out, width: CARD_WIDTH, height: CARD_HEIGHT };
  } finally {
    await browser.close();
  }
}

// CLI: node src/render.js '<headline>' '<orange,comma,sep>' '<heroUrlOrPath>' [outPath]
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const [, , headline, orange = "", hero, out = "out/card.jpg"] = process.argv;
  if (!headline || !hero) {
    console.error(
      'usage: node src/render.js "<HEADLINE>" "<word1,word2>" "<heroUrlOrPath>" [out.jpg]'
    );
    process.exit(1);
  }
  const orangeWords = orange ? orange.split(",").map((s) => s.trim()).filter(Boolean) : [];
  render({ heroImage: hero, headline, orangeWords, out })
    .then((r) => console.log(`[render] wrote ${r.path} (${r.width}×${r.height})`))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
