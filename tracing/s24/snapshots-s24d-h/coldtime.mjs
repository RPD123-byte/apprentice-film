import { createRequire } from "module";
const require = createRequire("/Users/computer/.npm/_npx/ab5cd9f6d13a2312/node_modules/");
const puppeteer = require("puppeteer");
import path from "path";
const browser = await puppeteer.launch({ headless: true, pipe: true, args: ["--allow-file-access-from-files", "--enable-webgl", "--use-angle=metal", "--ignore-gpu-blocklist"] });
const out = [];
for (const k of [7, 24, 54, 63, 70, 91]) {
  const page = await browser.newPage();
  await page.setViewport({ width: 2206, height: 946 });
  await page.goto("file://" + path.resolve("index.html"), { waitUntil: "load" });
  await page.waitForFunction(() => window.__film && window.__film.renderAt, { timeout: 120000 });
  const first = await page.evaluate(() => window.__lastMs);
  const ms = await page.evaluate((u) => { window.__film.renderAt(u); return window.__lastMs; }, (k - 7) / 25);
  const ms2 = await page.evaluate((u) => { window.__film.renderAt(u); return window.__lastMs; }, (k - 7) / 25);
  out.push(`k${k}: cold ${ms.toFixed(0)} ms, warm ${ms2.toFixed(0)} ms (k7 at load ${first.toFixed(0)} ms)`);
  await page.close();
}
console.log(out.join("\n"));
await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 4000))]);
try { browser.process()?.kill("SIGKILL"); } catch (e) {}
process.exit(0);
