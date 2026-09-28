// end-critic renderer (copy of end-s28-fix1 harness shoot.mjs, live tree): loads the REAL composition (index.html -> src/main.js) in the same headless Chrome and flags
// hyperframes snapshot uses, but with no protocol timeout (the snapshot tool's fixed 180 s per seek fails under load),
// and calls window.__film.renderAt(t) at exact times, reading the graded WebGL canvas (preserveDrawingBuffer) directly.
// Files are served by request interception (no server). Usage:
//   node shoot.mjs OUTDIR t1,t2,...        -> OUTDIR/f-<t>.png
import puppeteer from "/Users/computer/.npm/_npx/fadd01e97075bd25/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import fs from "node:fs";
import path from "node:path";

const ROOT = "/Users/computer/rootline/apprentice-film";
const [outDir, timesArg, page0 = "index.html"] = process.argv.slice(2);
const times = timesArg.split(",").map(Number);
fs.mkdirSync(outDir, { recursive: true });
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
if (process.env.DBG) await page.evaluate((d) => { window.__s28dbg = JSON.parse(d); }, process.env.DBG);
console.log("loaded in", ((Date.now() - t0) / 1000).toFixed(1), "s");
for (const t of times) {
  const s = Date.now();
  const url = await page.evaluate((t) => {
    window.__film.renderAt(t);
    return document.getElementById("film").toDataURL("image/png");
  }, t);
  const name = path.join(outDir, `${Math.round(t*25)}.png`);
  fs.writeFileSync(name, Buffer.from(url.split(",")[1], "base64"));
  console.log(t.toFixed(4), ((Date.now() - s) / 1000).toFixed(1), "s");
}
await browser.close();
