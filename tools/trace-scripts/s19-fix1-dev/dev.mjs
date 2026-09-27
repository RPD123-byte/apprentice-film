// s19 harness: load the shot once in headless Chrome (files via request interception), render graded frames at times.
// Usage: node dev.mjs outdir t1,t2,...
import fs from "fs"; import path from "path";
const puppeteer = (await import("/Users/computer/.npm/_npx/37e1042021ea9743/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js")).default;
const ROOT = "/Users/computer/rootline/apprentice-film";
const [outdir, times] = process.argv.slice(2);
fs.mkdirSync(outdir, { recursive: true });
const exe = "/Users/computer/.cache/puppeteer/chrome/mac_arm-138.0.7204.157/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox", "--use-angle=metal", "--enable-gpu"], protocolTimeout: 300000 });
const types = { ".html": "text/html", ".js": "text/javascript", ".woff2": "font/woff2", ".ttf": "font/ttf", ".png": "image/png", ".json": "application/json" };
const page = await browser.newPage();
await page.setViewport({ width: 2206, height: 946 });
await page.setRequestInterception(true);
page.on("request", (r) => {
  const u = new URL(r.url());
  if (u.hostname !== "local") return r.abort();
  const f = path.join(ROOT, decodeURIComponent(u.pathname));
  if (!fs.existsSync(f)) return r.respond({ status: 404, body: "nf" });
  r.respond({ status: 200, contentType: types[path.extname(f)] || "application/octet-stream", body: fs.readFileSync(f), headers: { "Cache-Control": "no-store" } });
});
page.on("pageerror", (e) => { console.log("[pageerror]", e.message); process.exit(2); });
page.on("console", (m) => { if (!/404/.test(m.text())) console.log("[page]", m.text()); });
page.goto(`http://local/snapshots/s19-fix1-dev/${process.env.PAGE || "harness.html"}?${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
await page.waitForFunction("window.__ready === true", { timeout: 120000 });
for (const ts of times.split(",")) {
  const t = parseFloat(ts);
  const dt = await page.evaluate((t) => window.renderAt(t), t);
  const out = path.join(outdir, `r-${t.toFixed(2)}.png`);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 2206, height: 946 } });
  console.log("saved", out, dt.toFixed(0) + "ms");
}
await browser.close();
