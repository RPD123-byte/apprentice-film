// node r.mjs outdir frame1,frame2,... [raw]   (frames are source frame indices at 25 fps)
import fs from "fs"; import path from "path";
const puppeteer = (await import("/Users/computer/.npm/_npx/37e1042021ea9743/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js")).default;
const ROOT = "/Users/computer/rootline/apprentice-film";
const [out, list, raw] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const exe = "/Users/computer/.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell";   // the snapshot tool's browser
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox", "--enable-webgl", "--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=metal", "--enable-gpu-rasterization", "--font-render-hinting=none", "--force-color-profile=srgb", "--enable-unsafe-webgpu"], protocolTimeout: 300000 });
const types = { ".html": "text/html", ".js": "text/javascript", ".woff2": "font/woff2", ".ttf": "font/ttf", ".png": "image/png", ".json": "application/json" };
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
page.goto(`http://local/snapshots/s08-rev2n-tools/h.html`, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
await page.waitForFunction("window.__done === true", { timeout: 60000 });
const frames = list.split(",").map(Number);
for (const f of frames) {
  const [d, ms] = await page.evaluate((t, raw) => window.renderT(t, raw), f / 25, !!raw);
  fs.writeFileSync(path.join(out, `r${f}.png`), Buffer.from(d.split(",")[1], "base64"));
  console.log(f, ms.toFixed(0) + "ms");
}
await browser.close();
