// end-s27-rev1 (review scratch): like render.mjs but renders each frame once per __s27dbg variant (s27 measuring hook). Usage: node render_dbg.mjs OUT F1,F2 raw|graded JSON_ARRAY_OF_VARIANTS
// answered from disk by request interception; /src/* comes from the FROZEN copy (frozen/src) unless LIVE=1.
// Usage: node render.mjs OUTDIR F1,F2,... [raw]   (F = frame index at 25 fps; renders film time F/25)
import puppeteer from "/Users/computer/.npm/_npx/fadd01e97075bd25/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import fs from "fs"; import path from "path";
const ROOT = "/Users/computer/rootline/apprentice-film";
const TOOLS = path.join(ROOT, "snapshots/end-s27-rev1-final/tools");
const SRCROOT = process.env.LIVE ? ROOT : path.join(TOOLS, "frozen");
const [outDir, frames, mode, dbgJson] = process.argv.slice(2); const VARS = JSON.parse(dbgJson || "[null]");
fs.mkdirSync(outDir, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".ttf": "font/ttf", ".png": "image/png", ".css": "text/css" };
const browser = await puppeteer.launch({
  executablePath: "/Users/computer/.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell",
  headless: "shell",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-web-security", "--no-sandbox"],
  protocolTimeout: 1200000,
});
const page = await browser.newPage();
await page.setViewport({ width: 2206, height: 946 });
await page.setRequestInterception(true);
page.on("request", (req) => {
  const u = new URL(req.url());
  if (u.host !== "r27.local") { req.abort(); return; }
  const p = decodeURIComponent(u.pathname);
  let f;
  if (p === "/harness.html") f = path.join(TOOLS, "harness.html");
  else if (p.startsWith("/src/")) f = path.join(SRCROOT, p);
  else f = path.join(ROOT, p);
  if (!fs.existsSync(f)) { console.log("[404]", p); req.respond({ status: 404, body: "nf" }); return; }
  req.respond({ status: 200, contentType: MIME[path.extname(f)] || "application/octet-stream", body: fs.readFileSync(f) });
});
page.on("console", (m) => { const t = m.text(); if (/error|fail|warn/i.test(t)) console.log("[page]", t); });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.goto("http://r27.local/harness.html?shots=" + (process.env.SHOTS || "s26,s27,s28"), { waitUntil: "load", timeout: 600000 });
await page.waitForFunction("window.ready === true", { timeout: 600000 });
const raw = mode === "raw";
for (const [vi, V] of VARS.entries()) { await page.evaluate((V) => { globalThis.__s27dbg = V; }, V);
for (const F of frames.split(",").map(Number)) {
  const t = F / 25;
  const ms = await page.evaluate((t, raw) => window.renderAt(t, raw), t, raw);
  const url = await page.evaluate((raw) => window.grab(raw), raw);
  fs.writeFileSync(path.join(outDir, `v${vi}_r${F}.png`), Buffer.from(url.split(",")[1], "base64"));
  console.log(`F${F} t=${t.toFixed(2)} draw=${ms.toFixed(0)}ms`);
}
}
await browser.close();
