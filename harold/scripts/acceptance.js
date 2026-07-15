// acceptance.js — render the exact acceptance card the brief specifies and
// save it to out/egypt.jpg. Verifies dimensions/format before we wire publish.
import { render, CARD_WIDTH, CARD_HEIGHT } from "../src/render.js";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const heroPath = path.resolve(__dirname, "egypt-hero.jpg");
const outPath = path.resolve(__dirname, "../out/egypt.jpg");

if (!existsSync(heroPath)) {
  console.error("Missing hero. Run: node scripts/make-hero.js");
  process.exit(1);
}

const r = await render({
  heroImage: heroPath,
  headline: "EGYPT: THE WINDIEST COUNTRY STARTS PROJECT TO POWER 6 MILLION HOMES",
  // ONE contiguous highlight (the outcome), per the single-span rule.
  orangeWords: ["POWER 6 MILLION HOMES"],
  out: outPath,
});

const bytes = statSync(outPath).size;
console.log(`[acceptance] wrote ${r.path}`);
console.log(`[acceptance] ${r.width}×${r.height}, ${bytes} bytes JPEG`);
if (r.width !== CARD_WIDTH || r.height !== CARD_HEIGHT) {
  console.error("[acceptance] FAIL: wrong dimensions");
  process.exit(1);
}
console.log("[acceptance] OK");
