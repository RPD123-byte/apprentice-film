// Headless renders of film frames (no server: requests are answered from disk by interception).
// usage: node render.mjs outdir t1,t2,...   -> outdir/r_<t>.png ; prints per-frame ms
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const require = createRequire("/Users/computer/.npm/_npx/668c188756b835f3/node_modules/");
const puppeteer = require("puppeteer-core");
const ROOT = "/Users/computer/rootline/apprentice-film";
const [out, times] = [process.argv[2], process.argv[3].split(",").map(Number)];
fs.mkdirSync(out, { recursive: true });
const exe = "/Users/computer/.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const browser = await puppeteer.launch({ executablePath: exe, headless: "shell", args: ["--use-angle=metal", "--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader", "--window-size=2206,946"] });
const page = await browser.newPage();
await page.setViewport({ width: 2206, height: 946 });
await page.setRequestInterception(true);
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".ttf": "font/ttf", ".png": "image/png", ".css": "text/css" };
page.on("request", (req) => {
  const u = new URL(req.url());
  if (u.host === "film.local") {
    const p = path.join(ROOT, decodeURIComponent(u.pathname));
    if (fs.existsSync(p) && fs.statSync(p).isFile()) req.respond({ status: 200, contentType: MIME[path.extname(p)] || "application/octet-stream", body: fs.readFileSync(p) });
    else req.respond({ status: 404, body: "" });
  } else req.continue();
});
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("[page]", m.text().slice(0, 300)); });
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 300)));
await page.goto("http://film.local/index.html", { waitUntil: "load", timeout: 120000 });
await page.waitForFunction(() => window.__film && window.__film.renderAt, { timeout: 120000 });
for (const t of times) {
  const ms = await page.evaluate((t) => { const a = performance.now(); window.__film.renderAt(t); return performance.now() - a; }, t);
  const data = await page.evaluate(() => document.getElementById("film").toDataURL("image/png"));
  fs.writeFileSync(path.join(out, `r_${t.toFixed(2)}.png`), Buffer.from(data.split(",")[1], "base64"));
  console.log(t.toFixed(2), ms.toFixed(0), "ms");
}
await browser.close();
