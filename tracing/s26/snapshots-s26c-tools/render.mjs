// Frame-exact renderer for the s26 harness (scratch). No server: requests to http://s26c.local/ are answered from disk
// by puppeteer request interception. Usage: node render.mjs OUTDIR F1,F2,... [raw] [shotmodule]
import puppeteer from "/Users/computer/.npm/_npx/fadd01e97075bd25/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import fs from "fs"; import path from "path";
const ROOT = "/Users/computer/rootline/apprentice-film";
const [outDir, frames, mode, shotMod] = process.argv.slice(2);
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
  if (u.host !== "s26c.local") { req.abort(); return; }
  let p = decodeURIComponent(u.pathname);
  const f = p === "/harness.html" ? path.join(ROOT, "snapshots/s26c-tools/harness.html") : path.join(ROOT, p);
  if (!fs.existsSync(f)) { req.respond({ status: 404, body: "nf" }); return; }
  req.respond({ status: 200, contentType: MIME[path.extname(f)] || "application/octet-stream", body: fs.readFileSync(f) });
});
page.on("console", (m) => { const t = m.text(); if (/error|fail|warn/i.test(t)) console.log("[page]", t); });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.goto("http://s26c.local/harness.html" + (shotMod ? "?shot=" + encodeURIComponent(shotMod) : ""), { waitUntil: "load", timeout: 600000 });
await page.waitForFunction("window.ready === true", { timeout: 600000 });
const raw = mode === "raw";
for (const F of frames.split(",").map(Number)) {
  const t = F / 25;
  const ms = await page.evaluate((t, raw) => window.renderAt(t, raw), t, raw);
  const url = await page.evaluate((raw) => window.grab(raw), raw);
  fs.writeFileSync(path.join(outDir, `r${F}.png`), Buffer.from(url.split(",")[1], "base64"));
  console.log(`F${F} t=${t.toFixed(2)} draw=${ms.toFixed(0)}ms`);
}
await browser.close();
