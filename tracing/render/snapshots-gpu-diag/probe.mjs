// end-critic renderer (copy of end-s28-fix1 harness shoot.mjs, live tree): loads the REAL composition (index.html -> src/main.js) in the same headless Chrome and flags
// hyperframes snapshot uses, but with no protocol timeout (the snapshot tool's fixed 180 s per seek fails under load),
// and calls window.__film.renderAt(t) at exact times, reading the graded WebGL canvas (preserveDrawingBuffer) directly.
// Files are served by request interception (no server). Usage:
//   node shoot.mjs OUTDIR t1,t2,...        -> OUTDIR/f-<t>.png
import puppeteer from "/Users/computer/.npm/_npx/fadd01e97075bd25/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import fs from "node:fs";
import path from "node:path";

const ROOT = "/Users/computer/rootline/apprentice-film";
const [T0s, T1s] = process.argv.slice(2); const T0 = +T0s, T1 = +T1s; const page0 = "index.html";
const EXE = "/Users/computer/.cache/hyperframes/chrome/chrome-headless-shell/mac_arm-152.0.7977.30/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const args = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--enable-features=CanvasDrawElement",
  "--enable-webgl", "--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=metal", "--enable-gpu-rasterization",
  "--font-render-hinting=none", "--force-color-profile=srgb", "--window-size=2206,946",
  "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
  "--autoplay-policy=no-user-gesture-required", "--disable-features=AudioServiceOutOfProcess,IsolateOrigins,site-per-process"];
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json",
  ".woff2": "font/woff2", ".ttf": "font/ttf", ".wav": "audio/wav", ".png": "image/png", ".css": "text/css" };
const browser = await puppeteer.launch({ headless: true, executablePath: EXE, args, protocolTimeout: 0 });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  const G = (window.__glp = { made: [], lost: [] });
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    const ctx = orig.call(this, type, attrs);
    if (/webgl/.test(type) && ctx && !this.__glp) {
      const where = (new Error().stack.split("\n").find((l) => /src\//.test(l)) || "?").replace(/^.*?src\//, "src/").replace(/\)$/, "");
      const rec = { id: G.made.length, type, where, t: window.__glp_t ?? null, w: this.width, h: this.height };
      this.__glp = rec; G.made.push(rec);
      this.addEventListener("webglcontextlost", () => { rec.lostAt = window.__glp_t ?? null; G.lost.push(rec.id); });
    }
    return ctx;
  };
});

await page.setViewport({ width: 2206, height: 946, deviceScaleFactor: 1 });
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warn") console.log("[page]", m.type(), m.text().slice(0, 300)); });
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 300)));
await page.setRequestInterception(true);
page.on("request", (req) => {
  const u = new URL(req.url());
  if (u.hostname !== "film.local") return req.continue();
  const f = path.join(ROOT, decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return req.respond({ status: 404, body: "" });
  if (f.endsWith(".wav")) return req.respond({ status: 404, body: "" });     // the score is irrelevant here
  req.respond({ status: 200, contentType: MIME[path.extname(f)] || "application/octet-stream", body: fs.readFileSync(f) });
});

const t0 = Date.now();
await page.goto("http://film.local/" + page0, { waitUntil: "load", timeout: 0 });
await page.waitForFunction(() => window.__film && window.__film.renderAt, { timeout: 0, polling: 500 });
console.log("loaded in", ((Date.now() - t0) / 1000).toFixed(1), "s; contexts at load:", await page.evaluate(() => JSON.stringify(window.__glp.made)));
let seen = 0, first = null;
for (let f = Math.round(T0 * 25); f <= Math.round(T1 * 25); f++) {
  const t = f / 25;
  const r = await page.evaluate((t) => {
    window.__glp_t = t; window.__film.renderAt(t);
    const out = document.getElementById("film"); const g = out.getContext("webgl") || out.getContext("webgl2");
    const px = new Uint8Array(4); if (g && !g.isContextLost()) g.readPixels(1103, 473, 1, 1, g.RGBA, g.UNSIGNED_BYTE, px);
    const G = window.__glp; const live = G.made.filter((m) => m.lostAt == null).length;
    return { gradeLost: !g || g.isContextLost(), px: Array.from(px), made: G.made.length, live, lost: G.lost.length };
  }, t);
  if (r.made !== seen || r.gradeLost) {
    const recs = await page.evaluate((a) => window.__glp.made.slice(a), seen);
    for (const m of recs) console.log(`t=${t.toFixed(2)} NEW ctx#${m.id} ${m.type} ${m.w}x${m.h} @ ${m.where}`);
    seen = r.made;
  }
  if (f % 125 === 0) console.log(`t=${t.toFixed(2)} made=${r.made} live=${r.live} lost=${r.lost} gradeLost=${r.gradeLost}`);
  if (r.gradeLost && !first) {
    first = t;
    const L = await page.evaluate(() => window.__glp.made.filter((m) => m.lostAt != null));
    console.log(`*** GRADE CONTEXT LOST at t=${t.toFixed(2)}; lost contexts:`, JSON.stringify(L));
    break;
  }
}
console.log(first ? "RESULT: lost at " + first : "RESULT: no loss through " + T1);
await browser.close();
