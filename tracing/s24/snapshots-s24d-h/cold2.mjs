import { createRequire } from "module";
const require = createRequire("/Users/computer/.npm/_npx/ab5cd9f6d13a2312/node_modules/");
const puppeteer = require("puppeteer");
import path from "path";
const browser = await puppeteer.launch({ headless: true, pipe: true, args: ["--allow-file-access-from-files", "--enable-webgl", "--use-angle=metal", "--ignore-gpu-blocklist"] });
const page = await browser.newPage();
page.on("console", (m) => console.log("[page]", m.text().slice(0, 300)));
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 300)));
await page.goto("file://" + path.resolve("index.html"), { waitUntil: "load" });
await page.waitForFunction(() => window.__film && window.__film.renderAt, { timeout: 120000 });
const r = await page.evaluate(async () => {
  const { shot } = await import("./src/shots/s24.js");
  const c = document.createElement("canvas"); c.width = 2206; c.height = 946; const g = c.getContext("2d");
  const res = [];
  for (const k of [7, 8, 9, 19, 24, 91]) {
    shot.release();
    const t = (2420 + k) / 25;
    const t0 = performance.now(); shot.draw(g, t - 97.08, t); g.getImageData(0, 0, 1, 1); const t1 = performance.now();
    shot.draw(g, t - 97.08, t); g.getImageData(0, 0, 1, 1); const t2 = performance.now();
    res.push(`k${k} cold ${(t1 - t0).toFixed(0)} warm ${(t2 - t1).toFixed(0)}`);
  }
  return res.join("\n");
});
console.log(r);
await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 4000))]);
try { browser.process()?.kill("SIGKILL"); } catch (e) {}
process.exit(0);
