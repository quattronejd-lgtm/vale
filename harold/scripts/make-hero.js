// make-hero.js — generate a deterministic wind-farm hero JPEG for the
// acceptance render (the sandbox blocks photo CDNs). Rasterizes an SVG
// golden-hour wind-farm scene to scripts/egypt-hero.jpg.
//
// In production, fetch.js supplies a real GNN hero photo URL instead.
import { launchChromium } from "../src/browser.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "egypt-hero.jpg");

const W = 1080;
const H = 1350;

function turbine(x, groundY, scale, angleDeg) {
  const hubY = groundY - 360 * scale;
  const towerTopW = 8 * scale;
  const towerBotW = 20 * scale;
  const bladeLen = 200 * scale;
  const blades = [0, 120, 240]
    .map((a) => {
      const ang = ((a + angleDeg) * Math.PI) / 180;
      const bx = x + bladeLen * Math.cos(ang - Math.PI / 2);
      const by = hubY + bladeLen * Math.sin(ang - Math.PI / 2);
      return `<path d="M ${x} ${hubY} Q ${x + (bx - x) * 0.5 + 14 * scale} ${
        hubY + (by - hubY) * 0.5
      } ${bx} ${by} L ${x} ${hubY} Z" fill="#f2ede4" opacity="0.95"/>`;
    })
    .join("");
  return `
    <polygon points="${x - towerBotW},${groundY} ${x - towerTopW},${hubY} ${
    x + towerTopW
  },${hubY} ${x + towerBotW},${groundY}" fill="#efe8dc" opacity="0.92"/>
    ${blades}
    <circle cx="${x}" cy="${hubY}" r="${9 * scale}" fill="#d9cfbc"/>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"  stop-color="#173a63"/>
      <stop offset="38%" stop-color="#5b6f8c"/>
      <stop offset="63%" stop-color="#e6a15a"/>
      <stop offset="82%" stop-color="#f6c777"/>
      <stop offset="100%" stop-color="#ffe0a0"/>
    </linearGradient>
    <radialGradient id="sun" cx="50%" cy="72%" r="42%">
      <stop offset="0%" stop-color="#fff3d6" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#ffd488" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#ffd488" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="hill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7a5a34"/>
      <stop offset="100%" stop-color="#4a3720"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <rect width="${W}" height="${H}" fill="url(#sun)"/>

  <!-- distant ridge -->
  <path d="M0 980 Q 270 930 540 968 T 1080 960 L1080 1350 L0 1350 Z" fill="#c98f52" opacity="0.5"/>
  <!-- foreground hill -->
  <path d="M0 1080 Q 300 1015 620 1075 T 1080 1060 L1080 1350 L0 1350 Z" fill="url(#hill)"/>

  ${turbine(300, 1090, 0.7, 18)}
  ${turbine(760, 1070, 0.85, -35)}
  ${turbine(540, 1078, 1.0, 62)}
  ${turbine(150, 1120, 0.5, 120)}
  ${turbine(930, 1110, 0.55, 200)}
</svg>`;

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0}</style></head><body>${svg}</body></html>`;

const browser = await launchChromium();
try {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  await page.locator("svg").screenshot({ path: OUT, type: "jpeg", quality: 94 });
  console.log(`[make-hero] wrote ${OUT}`);
} finally {
  await browser.close();
}
