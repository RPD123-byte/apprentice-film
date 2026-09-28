// usage: node render.mjs OUTDIR t1 t2 ...   (times snapped to 25 fps frames) -> OUTDIR/r-<frame>.png (graded film frames)
import { createRequire } from "module";
import fs from "fs";
const require = createRequire("/Users/computer/.npm/_npx/ab5cd9f6d13a2312/node_modules/");
const puppeteer = require("puppeteer");
const [out, ...ts0] = process.argv.slice(2);
const ts = ts0.flatMap((s) => s.includes(":") ? (() => { const [a, b, st = 1] = s.split(":").map(Number); const r = []; for (let f = a; f <= b; f += st) r.push(String(f / 25)); return r; })() : s.split(/[ ,]+/).filter(Boolean));
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ headless: "new", protocolTimeout: 1800000, args: ["--allow-file-access-from-files", "--disable-web-security", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=metal"] });
const page = await browser.newPage();
await page.setViewport({ width: 2206, height: 946 });
page.on("console", (m) => { if (m.type() === "error" || m.text().startsWith("[s25")) console.log("console:", m.text().slice(0, 400)); });
page.on("pageerror", (e) => console.log("pageerror", e.message)); page.on("requestfailed", (r) => console.log("reqfail", r.url()));
await page.goto("file:///Users/computer/rootline/apprentice-film/index.html", { waitUntil: "load", timeout: 120000 });
await page.waitForFunction(() => window.__film, { timeout: 120000 });
for (const s of ts) {
  const f = Math.round(+s * 25);
  const t = f / 25;
  const PRE = process.env.PRE === "1";
  const [url, ms] = await page.evaluate(async (t, PRE) => {
    const a = performance.now();
    if (PRE) {
      const S = (await import(new URL("./src/shots/s25.js", location.href).href)).shot;
      if (!window.__pc) { window.__pc = document.createElement("canvas"); window.__pc.width = 2206; window.__pc.height = 946; }
      const g = window.__pc.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#000"; g.fillRect(0, 0, 2206, 946);
      S.draw(g, t - 100.48, t);
      return [window.__pc.toDataURL("image/png"), performance.now() - a];
    }
    window.__film.renderAt(t); const ms = performance.now() - a; return [document.getElementById("film").toDataURL("image/jpeg", 0.96), ms]; }, t, PRE);
  fs.writeFileSync(`${out}/r-${String(f).padStart(5, "0")}.png`, Buffer.from(url.split(",")[1], "base64"));
  console.log("frame", f, (f / 25).toFixed(2), ms.toFixed(0) + " ms");
}
await browser.close();
