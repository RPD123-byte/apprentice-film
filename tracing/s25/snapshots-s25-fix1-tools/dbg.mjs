// node dbg.mjs OUT key[,key…] [modulePath]  -> OUT/d-<key>.png : a drawing painted alone at its key-frame placement
import { createRequire } from "module"; import fs from "fs"; import path from "path";
const require = createRequire("/Users/computer/.npm/_npx/668c188756b835f3/node_modules/");
const puppeteer = require("puppeteer-core");
const ROOT = "/Users/computer/rootline/apprentice-film";
const [out, keys, mod] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".ttf": "font/ttf", ".png": "image/png", ".css": "text/css" };
const browser = await puppeteer.launch({ executablePath: "/Users/computer/.cache/puppeteer/chrome/mac_arm-138.0.7204.157/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing", headless: "new", args: ["--window-size=2206,946"], defaultViewport: { width: 2206, height: 946 } });
const page = await browser.newPage();
await page.setRequestInterception(true);
page.on("request", (req) => { const u = new URL(req.url()); if (u.hostname === "film.local") { const p = path.join(ROOT, decodeURIComponent(u.pathname)); if (fs.existsSync(p) && fs.statSync(p).isFile()) req.respond({ status: 200, contentType: MIME[path.extname(p)] || "application/octet-stream", body: fs.readFileSync(p) }); else req.respond({ status: 404, body: "nf" }); } else req.continue(); });
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 400)));
page.on("console", (m) => console.log("[page]", m.text().slice(0, 300)));
await page.goto("http://film.local/snapshots/s25-fix1-tools/dbg.html", { waitUntil: "load" });
await page.waitForFunction(() => window.ready);
for (const k of keys.split(",")) {
  const url = await page.evaluate((k, mod) => window.show(k, { mod }), k, mod || null);
  fs.writeFileSync(path.join(out, `d-${k}.png`), Buffer.from(url.split(",")[1], "base64"));
}
await browser.close();
