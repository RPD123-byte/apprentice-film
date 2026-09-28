// Fast local renderer for the s24 harness (no server): headless Chrome over a pipe, file:// page.
// Usage: node shoot.mjs outdir k1,k2,... [raw]   -> outdir/kNN.png (graded unless "raw")
import { createRequire } from "module";
const require = createRequire("/Users/computer/.npm/_npx/ab5cd9f6d13a2312/node_modules/");
const puppeteer = require("puppeteer");
import fs from "fs"; import path from "path";
const [out, ks, mode] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ headless: true, pipe: true, args: ["--allow-file-access-from-files", "--enable-webgl", "--use-angle=metal", "--ignore-gpu-blocklist"] });
const page = await browser.newPage();
await page.setViewport({ width: 2206, height: 946, deviceScaleFactor: 1 });
page.on("console", (m) => { const t = m.text(); if (m.type() === "error" || /s24/.test(t)) console.log("[page]", m.type(), t.slice(0, 400)); });
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 400)));
const url = "file://" + path.resolve("index.html") + (mode === "raw" ? "#raw" : "");
await page.goto(url, { waitUntil: "load", timeout: 120000 });
await page.waitForFunction(() => window.__film && window.__film.renderAt, { timeout: 120000 });
const list = ks.split(",").map(Number);
for (const k of list) {
  const u = (k - 7) / 25;
  const ms = await page.evaluate((u) => { const t0 = performance.now(); window.__film.renderAt(u); return [performance.now() - t0, window.__lastMs]; }, u);
  const c = await page.$("#c");
  await c.screenshot({ path: path.join(out, `k${String(k).padStart(2, "0")}.png`) });
  console.log(`k${k} total ${ms[0].toFixed(0)} ms, draw ${ms[1].toFixed(0)} ms`);
}
await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 4000))]);
try { browser.process()?.kill("SIGKILL"); } catch (e) {}
process.exit(0);
