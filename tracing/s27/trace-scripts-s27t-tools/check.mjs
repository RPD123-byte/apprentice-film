// Console/pageerror + timing check of the s27t harness (s27 only, through the grade): node check.mjs [times]
import { createRequire } from "module";
const require = createRequire("/Users/computer/.npm/_npx/ab5cd9f6d13a2312/node_modules/");
const puppeteer = require("puppeteer");
import fs from "fs"; import path from "path";
const ROOT = "/Users/computer/rootline/apprentice-film";
const H = process.argv[3] || "snapshots/s27t-final/s27t-harness";
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".ttf": "font/ttf", ".png": "image/png" };
const browser = await puppeteer.launch({ headless: true, args: ["--use-angle=metal", "--enable-webgl", "--ignore-gpu-blocklist"] });
const page = await browser.newPage();
await page.setViewport({ width: 2206, height: 946 });
await page.setRequestInterception(true);
page.on("request", (req) => {
  const u = new URL(req.url());
  if (u.hostname === "film.local") {
    let f = path.join(ROOT, H, decodeURIComponent(u.pathname));
    if (fs.existsSync(f)) f = fs.realpathSync(f);
    if (fs.existsSync(f) && fs.statSync(f).isFile()) req.respond({ status: 200, contentType: types[path.extname(f)] || "application/octet-stream", body: fs.readFileSync(f) });
    else { console.log("[404]", u.pathname); req.respond({ status: 404, body: "nf" }); }
  } else req.continue();
});
let errs = 0;
page.on("pageerror", (e) => { errs++; console.log("[pageerror]", String(e).slice(0, 300)); });
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") { errs++; console.log("[" + m.type() + "]", m.text().slice(0, 300)); } });
const t0 = Date.now();
await page.goto("http://film.local/index.html", { waitUntil: "load" });
await page.waitForFunction(() => window.__film && window.__film.renderAt, { timeout: 170000 });
console.log("loaded in", Date.now() - t0, "ms");
const times = (process.argv[2] || "117.52,117.6,118,119.6,120.4,121.2,122,123,124,125,126,126.6,127,127.6,128,128.44,128.6,128.8,129,129.28").split(",").map(Number);
const res = await page.evaluate((times) => { const r = []; for (const t of times) { const a = performance.now(); window.__film.renderAt(t / 1.2); r.push([t, Math.round(performance.now() - a)]); } return r; }, times);
console.log(res.map(([t, ms]) => `${t}:${ms}ms`).join("  "));
console.log("errors/warnings:", errs);
const px = await page.evaluate(() => { const c = document.getElementById("film"); const d = document.createElement("canvas"); d.width = 100; d.height = 43; const g = d.getContext("2d"); g.drawImage(c, 0, 0, 100, 43); const a = g.getImageData(0, 0, 100, 43).data; let s = 0; for (let i = 0; i < a.length; i += 4) s += a[i] + a[i + 1] + a[i + 2]; return s / (a.length / 4) / 3; });
console.log("last frame mean", px.toFixed(1), "times from harness", JSON.stringify(await page.evaluate(() => (window.__times || []).slice(-25).map(([t, d]) => [t, Math.round(d)]))));
await browser.close();
