// node layers.mjs outdir frames '{"layers":"under","noFeet":true}' '{"lit":false}'
import fs from "fs";
import puppeteer from "/Users/computer/.npm/_npx/9b026cc17ed3d82e/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const [out, fr, dbg, km] = process.argv.slice(2);
let frames = []; for (const p of fr.split(",")) { if (p.includes("-")) { const [a, b] = p.split("-").map(Number); for (let i = a; i <= b; i++) frames.push(i); } else frames.push(Number(p)); }
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: "/Users/computer/.cache/puppeteer/chrome/mac_arm-138.0.7204.157/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing", headless: true, args: ["--allow-file-access-from-files", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-first-run", "--disable-gpu-sandbox", "--disable-features=CanvasNoise"], protocolTimeout: 1200000 });
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", String(e))); page.on("console", (m) => { const t = m.text(); if (!t.includes("willReadFrequently")) console.log("[page]", t); });
await page.goto("file://" + process.cwd() + "/layers.html", { timeout: 0, waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.title === "READY" || document.title === "FAIL", { timeout: 0 });
for (const n of frames) { const u = await page.evaluate((n, d, k) => layer(n, d, k), n, JSON.parse(dbg || "{}"), JSON.parse(km || "{}")); fs.writeFileSync(`${out}/r${n}.png`, Buffer.from(u.split(",")[1], "base64")); }
await browser.close();
