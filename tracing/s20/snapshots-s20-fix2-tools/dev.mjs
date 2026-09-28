// s20 b3 dev harness (scratch): load shot.html once in headless Chrome (files served by request interception, no
// server), render many times, save PNGs. Usage: node dev.mjs outdir t1,t2,... [query]
import fs from "fs"; import path from "path";
const puppeteer = (await import("/Users/computer/.npm/_npx/37e1042021ea9743/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js")).default;
const ROOT = "/Users/computer/rootline/apprentice-film";
const [outDir, times, q = ""] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const exe = "/Users/computer/.cache/puppeteer/chrome/mac_arm-138.0.7204.157/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox", "--use-angle=metal", "--enable-gpu", "--disable-features=CanvasNoise"], protocolTimeout: 600000 });
const types = { ".html": "text/html", ".js": "text/javascript", ".woff2": "font/woff2", ".ttf": "font/ttf", ".json": "application/json" };
const page = await browser.newPage();
await page.setViewport({ width: 2206, height: 946 });
await page.setRequestInterception(true);
page.on("request", (r) => {
  const u = new URL(r.url());
  if (u.hostname !== "local") return r.abort();
  const f = path.join(ROOT, decodeURIComponent(u.pathname));
  if (!fs.existsSync(f)) return r.respond({ status: 404, body: "nf" });
  r.respond({ status: 200, contentType: types[path.extname(f)] || "application/octet-stream", body: fs.readFileSync(f) });
});
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
page.on("console", (m) => console.log("[page]", m.text()));
await page.goto(`http://local/snapshots/s20-fix2-tools/shot.html${q ? "?" + q : ""}`, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
await page.waitForFunction("window.__ready === true", { timeout: 240000 });
for (const t of times.split(",").map(Number)) {
  const r = await page.evaluate((t) => window.__render(t), t);
  const b64 = r.url.split(",")[1];
  fs.writeFileSync(path.join(outDir, `r_${t.toFixed(2)}.png`), Buffer.from(b64, "base64"));
  console.log(`t=${t.toFixed(2)} ${r.ms.toFixed(0)}ms ${r.info || ""}`);
}
await browser.close();
