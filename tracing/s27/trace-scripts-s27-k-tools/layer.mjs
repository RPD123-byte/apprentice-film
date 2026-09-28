// Pre-grade s27 paint (no film grade) via the shot module itself: node layer.mjs 119.6,125 outdir [dbgJSON]
// dbgJSON sets globalThis.__s27dbg in the page (e.g. '{"room":"mask"}' paints the room layers flat magenta).
import { createRequire } from "module";
const require = createRequire("/Users/computer/.npm/_npx/ab5cd9f6d13a2312/node_modules/");
const puppeteer = require("puppeteer");
import fs from "fs"; import path from "path";
const ROOT = "/Users/computer/rootline/apprentice-film";
const times = process.argv[2].split(",").map(Number); const out = process.argv[3]; const dbg = process.argv[4] || "null";
fs.mkdirSync(out, { recursive: true });
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".ttf": "font/ttf", ".png": "image/png" };
const browser = await puppeteer.launch({ headless: true, args: ["--use-angle=metal", "--enable-webgl", "--ignore-gpu-blocklist", "--window-size=2206,946"] });
const page = await browser.newPage();
await page.setViewport({ width: 2206, height: 946 });
await page.setRequestInterception(true);
page.on("request", (req) => {
  const u = new URL(req.url());
  if (u.hostname === "film.local") {
    const f = path.join(ROOT, decodeURIComponent(u.pathname));
    if (fs.existsSync(f) && fs.statSync(f).isFile()) req.respond({ status: 200, contentType: types[path.extname(f)] || "application/octet-stream", body: fs.readFileSync(f), headers: { "Access-Control-Allow-Origin": "*" } });
    else req.respond({ status: 404, body: "nf" });
  } else req.continue();
});
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 300)));
page.on("console", (m) => { const t = m.text(); if (/error|fail/i.test(t)) console.log("[page]", t.slice(0, 300)); });
await page.goto("http://film.local/index.html", { waitUntil: "load" });
await page.waitForFunction(() => window.__film && window.__film.renderAt, { timeout: 120000 });
for (const t of times) {
  const data = await page.evaluate(async (t, dbg) => {
    globalThis.__s27dbg = JSON.parse(dbg);
    const m = await import("/src/shots/s27.js");
    const c = document.createElement("canvas"); c.width = 2206; c.height = 946;
    const g = c.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, 2206, 946);
    m.shot.draw(g, t - 117.52, t);
    globalThis.__s27dbg = null;
    return c.toDataURL("image/png");
  }, t, dbg);
  fs.writeFileSync(path.join(out, `l-${t.toFixed(2)}.png`), Buffer.from(data.split(",")[1], "base64"));
  console.log("t", t);
}
await browser.close();
