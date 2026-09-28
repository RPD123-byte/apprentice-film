// film.mjs OUTDIR t0,t1,... : load the real index.html (router + grade), call __film.renderAt(t) in order, time it, save the #film canvas
import fs from "fs"; import path from "path";
const puppeteer = (await import("/Users/computer/.npm/_npx/37e1042021ea9743/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js")).default;
const ROOT = "/Users/computer/rootline/apprentice-film";
const [out, list] = process.argv.slice(2);
fs.mkdirSync(path.join(ROOT, out), { recursive: true });
const ts = list.split(",").map(Number);
const exe = "/Users/computer/.cache/puppeteer/chrome/mac_arm-138.0.7204.157/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox"], protocolTimeout: 600000 });
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".woff2": "font/woff2", ".ttf": "font/ttf", ".png": "image/png", ".json": "application/json" };
const page = await browser.newPage();
await page.setViewport({ width: 2206, height: 946 });
await page.setRequestInterception(true);
const GSAP = "window.gsap={timeline(){const o={fromTo(){return o},seek(){return o}};return o}};";
page.on("request", (r) => { const u = new URL(r.url());
  if (u.hostname === "cdn.jsdelivr.net" && /gsap/.test(u.pathname)) return r.respond({ status: 200, contentType: "text/javascript", body: GSAP });
  if (u.hostname !== "local") return r.abort();
  const f = path.join(ROOT, decodeURIComponent(u.pathname)); if (!fs.existsSync(f)) return r.respond({ status: 404, body: "nf" });
  r.respond({ status: 200, contentType: types[path.extname(f)] || "application/octet-stream", body: fs.readFileSync(f) }); });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
page.on("console", (m) => { if (!/404/.test(m.text())) console.log("[page]", m.text()); });
await page.goto("http://local/index.html", { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForFunction("window.__film && window.__film.renderAt", { timeout: 120000 });
await new Promise((r) => setTimeout(r, 1500));
const res = [];
for (const t of ts) {
  const [b64, ms, id] = await page.evaluate(async (t) => {
    const a = performance.now(); window.__film.renderAt(t); const ms = performance.now() - a;
    const c = document.getElementById("film"); const o = document.createElement("canvas"); o.width = 2206; o.height = 946; o.getContext("2d").drawImage(c, 0, 0);
    const blob = await new Promise((r) => o.toBlob(r, "image/png")); const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ""; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return [btoa(s), ms];
  }, t);
  fs.writeFileSync(path.join(ROOT, out, `f-${t.toFixed(2)}.png`), Buffer.from(b64, "base64"));
  res.push(`${t.toFixed(2)}:${ms.toFixed(0)}ms`);
}
console.log(res.join(" "));
await browser.close();
