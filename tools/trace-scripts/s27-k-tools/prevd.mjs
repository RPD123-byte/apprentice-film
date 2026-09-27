// Fast preview for s27: loads the composition in headless Chrome (files served by request interception, no server),
// calls window.__film.renderAt(t) and saves the #film canvas. Usage: node prev.mjs 119,122.5 outdir [--raw]
import { createRequire } from "module";
const require = createRequire("/Users/computer/.npm/_npx/ab5cd9f6d13a2312/node_modules/");
const puppeteer = require("puppeteer");
import fs from "fs"; import path from "path";
const ROOT = "/Users/computer/rootline/apprentice-film";
const times = process.argv[2].split(",").map(Number); const out = process.argv[3]; const raw = process.argv.includes("--raw"); const dbg = process.argv[4] && !process.argv[4].startsWith("--") ? process.argv[4] : "null";
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
page.on("console", (m) => { const t = m.text(); if (/error|fail|s27/i.test(t)) console.log("[page]", t.slice(0, 300)); });
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 300)));
const T0=Date.now(); await page.goto("http://film.local/index.html", { waitUntil: "load" }); console.log("loaded", Date.now()-T0);
await page.waitForFunction(() => window.__film && window.__film.renderAt, { timeout: 120000 }); console.log("ready", Date.now()-T0);
for (const t of times) {
  const t0 = Date.now();
  const data = await page.evaluate(async (t, raw, dbg) => { globalThis.__s27dbg = JSON.parse(dbg);
    window.__film.renderAt(t);
    const c = document.getElementById("film");
    return c.toDataURL("image/png");
  }, t, raw, dbg);
  fs.writeFileSync(path.join(out, `r-${t.toFixed(2)}.png`), Buffer.from(data.split(",")[1], "base64"));
  console.log("t", t, (Date.now() - t0) + "ms");
}
await browser.close();
