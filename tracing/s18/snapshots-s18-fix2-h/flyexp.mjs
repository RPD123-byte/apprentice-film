// node flyexp.mjs frames box(x0,y0,x1,y1) '<json list of settings>'
import fs from "fs"; import { execSync } from "child_process";
import puppeteer from "/Users/computer/.npm/_npx/9b026cc17ed3d82e/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const [fr, bx, sets] = process.argv.slice(2);
let frames = []; for (const p of fr.split(",")) { if (p.includes("-")) { const [a, b] = p.split("-").map(Number); for (let i = a; i <= b; i++) frames.push(i); } else frames.push(Number(p)); }
const box = bx.split(",").map(Number), SETS = JSON.parse(fs.readFileSync(sets));
const browser = await puppeteer.launch({ executablePath: "/Users/computer/.cache/puppeteer/chrome/mac_arm-138.0.7204.157/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing", headless: true, args: ["--allow-file-access-from-files", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-first-run", "--disable-gpu-sandbox", "--disable-features=CanvasNoise"], protocolTimeout: 3600000 });
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", String(e))); page.on("console", (m) => { const t = m.text(); if (!t.includes("willReadFrequently") && !t.includes("GPU stall")) console.log("[page]", t); });
await page.goto("file://" + process.cwd() + "/flyexp.html", { timeout: 0, waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.title === "READY" || document.title === "FAIL", { timeout: 0 });
for (const f of frames) {
  const raw = execSync(`python3 -c "import cv2,sys;s=cv2.imread('../s18-fix2-src/f%04d.png'%${f},0);sys.stdout.buffer.write(s[${box[1]}:${box[3]},${box[0]}:${box[2]}].tobytes())"`, { maxBuffer: 1 << 25 });
  await page.evaluate((f, b, s) => prep(f, b, s), f, box, raw.toString("base64"));
  const out = [];
  for (const st of SETS) { const e = await page.evaluate((st) => trial(st), st); out.push(e.map((v) => v.toFixed(2)).join("/")); }
  console.log(f, out.join("  "));
}
await browser.close();
