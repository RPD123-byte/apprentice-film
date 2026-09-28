// s22 fix harness: render film frames through the real pipeline (shot + post grade) and save PNGs.
// usage: node rh.mjs OUTDIR t1,t2,...  [--frames F0:F1:step]  (times in s; frames are 25 fps indices)
import { createRequire } from "module";
import fs from "fs";
const require = createRequire("/Users/computer/.npm/_npx/ab5cd9f6d13a2312/node_modules/");
const puppeteer = require("puppeteer");
const [out, list, ...rest] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
let times = [];
if (list && list !== "-") times = list.split(",").map(Number);
for (let i = 0; i < rest.length; i++) if (rest[i] === "--frames") { const [a, b, s] = rest[++i].split(":").map(Number); for (let F = a; F <= b; F += s || 1) times.push(F / 25); }
const browser = await puppeteer.launch({ headless: "new", protocolTimeout: 900000, args: ["--allow-file-access-from-files", "--disable-web-security", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=metal"] });
const page = await browser.newPage();
await page.setViewport({ width: 2206, height: 946 });
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("console:", m.type(), m.text().slice(0, 300)); });
page.on("pageerror", (e) => console.log("pageerror:", String(e).slice(0, 300)));
await page.goto("file:///Users/computer/rootline/apprentice-film/index.html", { waitUntil: "load", timeout: 90000 });
await page.waitForFunction(() => window.__film, { timeout: 90000 });
// warm the shot (first frame builds caches)
// pool mode: overwrite a fixed set of existing files (no disk growth); pool_map.json records which frame is where
const POOL = process.env.POOL ? fs.readFileSync(new URL("./pool_paths.txt", import.meta.url), "utf8").trim().split("\n") : null;
if (POOL && times.length > POOL.length) throw new Error("pool too small");
const pmap = {};
let k = 0;
for (const t of times) {
  const r = await page.evaluate((t) => {
    const t0 = performance.now();
    window.__film.renderAt(t);
    const ms = performance.now() - t0;
    return { ms, url: document.getElementById("film").toDataURL("image/png") };
  }, t);
  const F = Math.round(t * 25);
  const path = POOL ? new URL(POOL[k++], import.meta.url).pathname : `${out}/r-${F}.png`;
  fs.writeFileSync(path, Buffer.from(r.url.split(",")[1], "base64"));
  pmap[F] = path;
  console.log(`t=${t.toFixed(3)} F=${F} ${r.ms.toFixed(0)} ms`);
}
if (POOL) fs.writeFileSync(new URL("./pool_map.json", import.meta.url), JSON.stringify(pmap));
await browser.close();
