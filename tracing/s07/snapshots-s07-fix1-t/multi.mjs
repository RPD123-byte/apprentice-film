// multi.mjs OUTDIR n0,n1,... [query] : render s07 at frame n/25 (graded unless pre=1), one page load, save OUTDIR/r####.png
import fs from "fs"; import path from "path";
const puppeteer = (await import("/Users/computer/.npm/_npx/37e1042021ea9743/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js")).default;
const ROOT = "/Users/computer/rootline/apprentice-film";
const [out, list, q = ""] = process.argv.slice(2);
fs.mkdirSync(path.join(ROOT, out), { recursive: true });
const ns = list.split(",").flatMap((s) => { const m = s.split("-"); if (m.length === 2) { const r = []; for (let i = +m[0]; i <= +m[1]; i++) r.push(i); return r; } return [+s]; });
const exe = "/Users/computer/.cache/puppeteer/chrome/mac_arm-138.0.7204.157/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox"], protocolTimeout: 300000 });
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".woff2": "font/woff2", ".ttf": "font/ttf", ".png": "image/png", ".json": "application/json" };
const page = await browser.newPage();
await page.setViewport({ width: 2206, height: 946 });
await page.setRequestInterception(true);
page.on("request", (r) => { const u = new URL(r.url()); if (u.hostname !== "local") return r.abort(); const f = path.join(ROOT, decodeURIComponent(u.pathname)); if (!fs.existsSync(f)) return r.respond({ status: 404, body: "nf" }); r.respond({ status: 200, contentType: types[path.extname(f)] || "application/octet-stream", body: fs.readFileSync(f) }); });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
page.on("console", (m) => { if (!/404/.test(m.text())) console.log("[page]", m.text()); });
let ok = false;
for (let attempt = 0; attempt < 4 && !ok; attempt++) {
  page.goto(`http://local/snapshots/s07-fix1-t/m.html${q ? "?" + q : ""}`, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
  try { await page.waitForFunction("window.__done === true", { timeout: 45000 }); ok = true; } catch (e) { console.log("retry load", attempt); }
}
if (!ok) { console.log("FAILED to load"); process.exit(1); }
const times = [];
for (const n of ns) {
  const [b64, ms] = await page.evaluate((t) => window.__render(t), n / 25);
  fs.writeFileSync(path.join(ROOT, out, `r${String(n).padStart(4, "0")}.png`), Buffer.from(b64, "base64"));
  times.push(ms.toFixed(0));
}
console.log("rendered", ns.length, "ms:", times.join(","));
await browser.close();
