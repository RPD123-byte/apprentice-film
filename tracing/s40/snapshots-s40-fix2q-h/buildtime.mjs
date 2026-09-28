import { createRequire } from "module"; import fs from "fs"; import path from "path";
const require = createRequire(import.meta.url);
const puppeteer = require("/Users/computer/.npm/_npx/fadd01e97075bd25/node_modules/puppeteer-core");
const ROOT = "/Users/computer/rootline/apprentice-film";
const EXE = "/Users/computer/.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const which = process.argv[2]; // "cur" or "orig"
const MIME = { ".html": "text/html", ".js": "text/javascript", ".woff2": "font/woff2", ".ttf": "font/ttf" };
const browser = await puppeteer.launch({ executablePath: EXE, headless: "shell", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage();
await page.setRequestInterception(true);
page.on("request", (req) => {
  const u = new URL(req.url());
  if (u.host !== "film.local") return req.continue();
  let rel = decodeURIComponent(u.pathname);
  // serve the chosen version of s40's files
  const m = rel.match(/^\/src\/shots\/s40\/(owl|card|data|grain)\.js$/);
  let f = path.join(ROOT, rel);
  if (m && which === "orig") f = path.join(ROOT, "snapshots/s40-fix2q-h", m[1] + ".js.orig");
  if (!fs.existsSync(f)) return req.respond({ status: 404, body: "" });
  req.respond({ status: 200, contentType: MIME[path.extname(rel)] || "text/plain", body: fs.readFileSync(f) });
});
await page.goto("http://film.local/tools/owl-gallery.html").catch(() => {});
await page.setContent("<html><body></body></html>");
const r = await page.evaluate(async () => {
  const m = await import("/src/shots/s40/card.js");
  const c = document.createElement("canvas"); c.width = 2206; c.height = 946; const g = c.getContext("2d");
  const out = [];
  for (let i = 0; i < 3; i++) { m.releaseCard(); const t0 = performance.now(); m.paintCard(g, 138); out.push(performance.now() - t0); }
  const t1 = performance.now(); for (let i = 0; i < 20; i++) m.paintCard(g, 139.3 + i * 0.01); out.push((performance.now() - t1) / 20);
  return out;
});
console.log(which, "plate builds (ms):", r.slice(0, 3).map((x) => x.toFixed(0)).join(" "), " per-frame paintCard:", r[3].toFixed(1));
await browser.close();
