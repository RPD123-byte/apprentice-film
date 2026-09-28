// node tailfit.mjs frames out.json   -> tail pose [a, tx, ty, spread] per frame, coordinate search on the graded render
import fs from "fs"; import { execSync } from "child_process";
import puppeteer from "/Users/computer/.npm/_npx/9b026cc17ed3d82e/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const [fr, outp] = process.argv.slice(2);
let frames = []; for (const p of fr.split(",")) { if (p.includes("-")) { const [a, b] = p.split("-").map(Number); for (let i = a; i <= b; i++) frames.push(i); } else frames.push(Number(p)); }
const PATH = {}; { const s = fs.readFileSync("../../src/shots/s18/shotA.js", "utf8"); for (const r of eval(s.match(/PATH_A = (\[[\s\S]*?\]);/)[1])) PATH[r[0]] = [r[1], r[2]]; }
const OUT = fs.existsSync(outp) ? JSON.parse(fs.readFileSync(outp)) : {};
const browser = await puppeteer.launch({ executablePath: "/Users/computer/.cache/puppeteer/chrome/mac_arm-138.0.7204.157/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing", headless: true, args: ["--allow-file-access-from-files", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-first-run", "--disable-gpu-sandbox", "--disable-features=CanvasNoise"], protocolTimeout: 3600000 });
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", String(e)));
await page.goto("file://" + process.cwd() + "/tailfit.html", { timeout: 0, waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.title === "READY" || document.title === "FAIL", { timeout: 0 });
for (const f of frames) {
  const [dx, dy] = PATH[f], box = [Math.max(0, 856 + dx), 371 + dy, Math.min(2206, 1064 + dx), 504 + dy];
  const raw = execSync(`python3 -c "import cv2,sys;s=cv2.imread('../s18-fix2-src/f%04d.png'%${f},0);sys.stdout.buffer.write(s[${box[1]}:${box[3]},${box[0]}:${box[2]}].tobytes())"`, { maxBuffer: 1 << 24 });
  const p0 = await page.evaluate((f, b, s) => prep(f, b, s), f, box, raw.toString("base64"));
  let pose = p0 ? [...p0, p0[3] || 0] .slice(0, 4) : [0, 0, 0, 0];
  const obj = async (p) => { const [e6, e2] = await page.evaluate((p) => ev(p), p); return e6 + 0.5 * e2; };
  const e0 = p0 ? await obj(p0) : await page.evaluate(() => ev(null)).then(([a, b]) => a + 0.5 * b);
  let best = await obj(pose); const st = [3, 3, 3, 4]; let nev = 2;
  for (let round = 0; round < 4; round++) {
    let imp = true;
    while (imp && nev < 80) { imp = false;
      for (let i = 0; i < 4; i++) for (const sg of [1, -1]) { const q = [...pose]; q[i] += sg * st[i]; const e = await obj(q); nev++; if (e < best - 1e-3) { best = e; pose = q; imp = true; break; } } }
    for (let i = 0; i < 4; i++) st[i] /= 2;
  }
  if (best < e0 - 0.05) OUT[f] = pose.map((v) => Math.round(v * 100) / 100);
  console.log(f, "e0", e0.toFixed(2), "->", best.toFixed(2), JSON.stringify(pose.map((v) => Math.round(v * 100) / 100)), "evals", nev, best < e0 - 0.05 ? "KEEP" : "skip");
  fs.writeFileSync(outp, JSON.stringify(OUT));
}
await browser.close();
