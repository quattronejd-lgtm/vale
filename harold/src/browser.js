// browser.js — launch Playwright Chromium, preferring the preinstalled
// binary so we never trigger a browser download.
//
// Resolution order:
//   1. HAROLD_CHROMIUM env var (explicit override)
//   2. PLAYWRIGHT_BROWSERS_PATH/chromium symlink (this environment)
//   3. Playwright's own managed download (default)
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import path from "node:path";

export function chromiumExecutablePath() {
  if (process.env.HAROLD_CHROMIUM && existsSync(process.env.HAROLD_CHROMIUM)) {
    return process.env.HAROLD_CHROMIUM;
  }
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (base) {
    const link = path.join(base, "chromium");
    if (existsSync(link)) return link;
  }
  return undefined; // fall back to Playwright's bundled resolution
}

export function launchChromium(extraArgs = []) {
  const executablePath = chromiumExecutablePath();
  return chromium.launch({
    headless: true,
    executablePath,
    args: ["--force-color-profile=srgb", "--hide-scrollbars", ...extraArgs],
  });
}
