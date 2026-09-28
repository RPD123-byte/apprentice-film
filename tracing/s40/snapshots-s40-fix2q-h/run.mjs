// Exact-time render harness for s40 (fix pass 5). Loads the real index.html pipeline through request interception
// (no server), renders each requested film time with window.__film.renderAt(t) and saves the graded #film canvas.
// Usage: node run.mjs OUTDIR t1,t2,...   (writes OUTDIR/r-<t>.png)
import { createRequire } from "module";
import fs from "fs";
import path from "path";
const require = createRequire(import.meta.url);
const puppeteer = require("/Users/computer/.npm/_npx/fadd01e97075bd25/node_modules/puppeteer-core");
const ROOT = "/Users/computer/rootline/apprentice-film";
const EXE = "/Users/computer/.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const out = process.argv[2], times = process.argv[3].split(",").map(Number), PRE = process.argv[4] === "pre", NOG = process.argv[4] === "nograde";
fs.mkdirSync(out, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".ttf": "font/ttf", ".css": "text/css", ".png": "image/png" };
const browser = await puppeteer.launch({
  executablePath: EXE, headless: "shell",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-webgl", "--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--window-size=2206,946"],
});
const page = await browser.newPage();
await page.setViewport({ width: 2206, height: 946, deviceScaleFactor: 1 });
await page.setRequestInterception(true);
page.on("request", (req) => {
  const u = new URL(req.url());
  if (u.host !== "film.local") return req.continue();
  const f = path.join(ROOT, decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) return req.respond({ status: 404, body: "" });
  req.respond({ status: 200, contentType: MIME[path.extname(f)] || "application/octet-stream", body: fs.readFileSync(f) });
});
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("http://film.local/index.html", { waitUntil: "load", timeout: 240000 });
await page.waitForFunction(() => window.__film && window.__film.renderAt, { timeout: 240000 });
for (const t of times) {
  const t0 = Date.now();
  const url = await page.evaluate((t) => {
    const p0 = performance.now();
    window.__film.renderAt(t);
    const dt = performance.now() - p0;
    return [document.getElementById("film").toDataURL("image/png"), dt];
  }, t);
  if (!NOG) fs.writeFileSync(path.join(out, `r-${t.toFixed(3)}.png`), Buffer.from(url[0].split(",")[1], "base64"));
  if (PRE || NOG) {
    const pre = await page.evaluate(async (t) => {
      const m = await import("/src/shots/s40_endcard.js");
      const c = document.createElement("canvas"); c.width = 2206; c.height = 946;
      const g = c.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, 2206, 946);
      m.s40.draw(g, t - 136, t);
      return c.toDataURL("image/png");
    }, t);
    fs.writeFileSync(path.join(out, `p-${t.toFixed(3)}.png`), Buffer.from(pre.split(",")[1], "base64"));
  }
  console.log(`t=${t.toFixed(3)} draw ${url[1].toFixed(1)} ms (total ${Date.now() - t0} ms)`);
}
if (errs.length) console.log("ERRORS:\n" + errs.join("\n"));
await browser.close();
