// node render.mjs outdir frames(comma, a-b ranges) [raw] [module]
import fs from "fs";
import puppeteer from "/Users/computer/.npm/_npx/9b026cc17ed3d82e/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const [out, fr, raw, mod] = process.argv.slice(2);
const frames = [];
for (const p of fr.split(",")) { if (p.includes("-")) { const [a, b] = p.split("-").map(Number); for (let i = a; i <= b; i++) frames.push(i); } else frames.push(Number(p)); }
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: "/Users/computer/.cache/puppeteer/chrome/mac_arm-138.0.7204.157/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  headless: true,
  args: ["--allow-file-access-from-files", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-first-run", "--disable-gpu-sandbox", "--disable-features=CanvasNoise"],
  protocolTimeout: 1200000,
});
const page = await browser.newPage();
page.on("console", (m) => { const t = m.text(); if (!t.includes("GPU stall") && !t.includes("willReadFrequently")) console.log("[page]", t); });
let url = "file:///Users/computer/rootline/apprentice-film/snapshots/s18-h/h.html";
if (mod) url += "?m=" + encodeURIComponent(mod);
await page.goto(url);
await page.waitForFunction(() => document.title === "READY" || document.title === "FAIL", { timeout: 600000 });
const times = [];
for (const n of frames) {
  const r = await page.evaluate((n, raw) => window.renderFrame(n, raw), n, !!(raw && raw !== "0"));
  fs.writeFileSync(`${out}/r${n}.png`, Buffer.from(r.url.split(",")[1], "base64"));
  times.push([n, r.ms]);
}
console.log("ms:", times.map(([n, v]) => `${n}:${v.toFixed(0)}`).join(" "));
await browser.close();
