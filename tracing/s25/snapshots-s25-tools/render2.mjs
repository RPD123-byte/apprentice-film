// s25 scratch harness: render film frames headless without a server (requests are answered from disk by
// puppeteer request interception). Usage:
//   node render.mjs OUTDIR f0 f1 [step]        -> OUTDIR/rNNNNN.png for source frames f0..f1 (t = f/25)
//   node render.mjs OUTDIR list f,f,f           -> those frames
// Also prints per-frame draw time (ms) of renderAt.
import { createRequire } from "module";
import fs from "fs";
import path from "path";
const require = createRequire("/Users/computer/.npm/_npx/668c188756b835f3/node_modules/");
const puppeteer = require("puppeteer-core");
const ROOT = process.env.ROOT || "/Users/computer/rootline/apprentice-film";
const [out, a, b, c] = process.argv.slice(2);
let frames = [];
if (a === "list") frames = b.split(",").map(Number);
else { const st = Number(c || 1); for (let f = Number(a); f <= Number(b); f += st) frames.push(f); }
fs.mkdirSync(out, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".ttf": "font/ttf", ".png": "image/png", ".css": "text/css" };
const browser = await puppeteer.launch({
  executablePath: "/Users/computer/.cache/puppeteer/chrome/mac_arm-138.0.7204.157/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  headless: "new",
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--window-size=2206,946", "--disable-web-security"],
  defaultViewport: { width: 2206, height: 946 },
  protocolTimeout: 600000,
});
const page = await browser.newPage();
await page.setRequestInterception(true);
page.on("request", (req) => {
  const u = new URL(req.url());
  if (u.hostname === "film.local") {
    const p = path.join(ROOT, decodeURIComponent(u.pathname));
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      req.respond({ status: 200, contentType: MIME[path.extname(p)] || "application/octet-stream", body: fs.readFileSync(p) });
    } else req.respond({ status: 404, body: "nf" });
  } else req.continue();
});
page.on("console", (m) => { const t = m.text(); if (/error|fail|s25/i.test(t)) console.log("[page]", t.slice(0, 300)); });
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 400)));
await page.goto("http://film.local/index.html", { waitUntil: "load", timeout: 120000 });
await page.waitForFunction(() => window.__film && window.__film.renderAt, { timeout: 120000 });
for (const f of frames) {
  const t = f / 25;
  const res = await page.evaluate(async (t) => {
    const t0 = performance.now();
    window.__film.renderAt(t);
    const dt = performance.now() - t0;
    const c = document.getElementById("film");
    return { dt, url: c.toDataURL("image/png") };
  }, t);
  fs.writeFileSync(path.join(out, `r${String(f).padStart(5, "0")}.png`), Buffer.from(res.url.split(",")[1], "base64"));
  console.log(`f ${f} t ${t.toFixed(2)} ${res.dt.toFixed(0)} ms`);
}
await browser.close();
