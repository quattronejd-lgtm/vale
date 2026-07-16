// render.js — screenshot each .slide of harold-carousel.html to a PNG.
// Run from repo root: NODE_PATH=harold/node_modules node case-study/carousel/render.js
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const dir = __dirname;
const htmlPath = path.join(dir, "harold-carousel.html");

(async () => {
  const executablePath = process.env.PLAYWRIGHT_BROWSERS_PATH
    ? path.join(process.env.PLAYWRIGHT_BROWSERS_PATH, "chromium")
    : undefined;
  const browser = await chromium.launch({
    headless: true,
    executablePath: executablePath && fs.existsSync(executablePath) ? executablePath : undefined,
    args: ["--force-color-profile=srgb", "--hide-scrollbars"],
  });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  await page.goto("file://" + htmlPath, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  const slides = await page.$$(".slide");
  for (let i = 0; i < slides.length; i++) {
    const out = path.join(dir, `harold-carousel-${String(i + 1).padStart(2, "0")}.png`);
    await slides[i].screenshot({ path: out });
    console.log("wrote", out);
  }

  // LinkedIn document upload wants a single PDF, one slide per page.
  await page.addStyleTag({
    content: "body{background:none;margin:0;} .slide{page-break-after:always;} .slide:last-child{page-break-after:auto;}",
  });
  const pdfOut = path.join(dir, "harold-carousel-LinkedIn.pdf");
  await page.pdf({
    path: pdfOut,
    width: "1080px",
    height: "1350px",
    printBackground: true,
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
  });
  console.log("wrote", pdfOut);
  await browser.close();
})();
