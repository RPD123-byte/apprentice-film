// node render.mjs outdir frames(comma, a-b ranges) [order: fwd|rev]  -> renders the REAL main.js at t=(n+0.5)/25
import fs from "fs";
import puppeteer from "/Users/computer/.npm/_npx/9b026cc17ed3d82e/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const [out, fr, order] = process.argv.slice(2);
let frames = [];
for (const p of fr.split(",")) { if (p.includes("-")) { const [a, b] = p.split("-").map(Number); for (let i = a; i <= b; i++) frames.push(i); } else frames.push(Number(p)); }
if (order === "rev") frames = frames.reverse();
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: "/Users/computer/.cache/puppeteer/chrome/mac_arm-138.0.7204.157/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  headless: true,
  args: ["--allow-file-access-from-files", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-first-run", "--disable-gpu-sandbox", "--disable-features=CanvasNoise"],
  protocolTimeout: 1200000,
});
const page = await browser.newPage();
page.on("console", (m) => { const t = m.text(); if (!t.includes("GPU stall") && !t.includes("willReadFrequently")) console.log("[page]", t); });
page.on("pageerror", (e) => console.log("[pageerror]", String(e)));
await page.goto("file://" + process.cwd() + "/h.html");
await page.waitForFunction(() => document.title === "READY" || document.title === "FAIL", { timeout: 600000 });
const times = [];
for (const n of frames) {
  const t = n / 25;
  const r = await page.evaluate((t) => window.renderT(t), t);
  fs.writeFileSync(`${out}/r${n}.png`, Buffer.from(r.url.split(",")[1], "base64"));
  times.push([n, r.ms]);
}
console.log("ms:", times.map(([n, v]) => `${n}:${v.toFixed(0)}`).join(" "));
await browser.close();
