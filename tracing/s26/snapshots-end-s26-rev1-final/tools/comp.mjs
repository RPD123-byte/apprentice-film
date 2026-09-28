// end-s26-rev1 (review scratch): load the FULL composition (index.html) headless without a server (request
// interception) and time window.__film.renderAt(t) per frame; save the WebGL output canvas. Usage: node comp.mjs OUT F1,F2,...
import puppeteer from "/Users/computer/.npm/_npx/fadd01e97075bd25/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import fs from "fs"; import path from "path";
const ROOT = "/Users/computer/rootline/apprentice-film";
const GSAP = "/Users/computer/vibe-check/.agents/skills/talking-head-recut/assets/vendor/gsap.min.js";
const [outDir, frames] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".woff2": "font/woff2", ".ttf": "font/ttf", ".wav": "audio/wav" };
const browser = await puppeteer.launch({
  executablePath: "/Users/computer/.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell",
  headless: "shell", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"], protocolTimeout: 1200000,
});
const page = await browser.newPage();
await page.setViewport({ width: 2206, height: 946 });
await page.setRequestInterception(true);
page.on("request", (req) => {
  const u = new URL(req.url());
  if (u.host === "cdn.jsdelivr.net" && u.pathname.includes("gsap")) { req.respond({ status: 200, contentType: "text/javascript", body: fs.readFileSync(GSAP) }); return; }
  if (u.host !== "c26.local") { console.log("[abort]", req.url().slice(0,120)); req.abort(); return; }
  const f = path.join(ROOT, decodeURIComponent(u.pathname));
  if (/\.wav$/.test(f)) { req.respond({ status: 404, body: "" }); return; }
  if (!fs.existsSync(f)) { req.respond({ status: 404, body: "nf" }); return; }
  req.respond({ status: 200, contentType: MIME[path.extname(f)] || "application/octet-stream", body: fs.readFileSync(f) });
});
page.on("console", (m) => { const t = m.text(); console.log("[page]", t.slice(0, 200)); });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
const t0 = Date.now();
await page.goto("http://c26.local/index.html", { waitUntil: "domcontentloaded", timeout: 1200000 });
for (let i = 0; i < 240; i++) {
  const st = await page.evaluate(() => ({ film: !!window.__film, tl: !!(window.__timelines && window.__timelines.main), fonts: document.fonts.status, n: document.fonts.size }));
  if (st.film && st.tl) break;
  if (i % 6 === 0) console.log("state", JSON.stringify(st), ((Date.now() - t0) / 1000).toFixed(0) + "s");
  await new Promise((r) => setTimeout(r, 5000));
}
console.log("load s", ((Date.now() - t0) / 1000).toFixed(1));
for (const F of frames.split(",").map(Number)) {
  const t = F / 25;
  const ms = await page.evaluate((t) => { const a = performance.now(); window.__film.renderAt(t); return performance.now() - a; }, t);
  const url = await page.evaluate(() => document.getElementById("film").toDataURL("image/png"));
  fs.writeFileSync(path.join(outDir, `c${F}.png`), Buffer.from(url.split(",")[1], "base64"));
  console.log(`F${F} t=${t.toFixed(2)} renderAt=${ms.toFixed(0)}ms`);
}
await browser.close();
