// node fit.mjs frames(a-b,..) outjson [initjson]  -> fits the shot-A feet per frame (see fit.html)
import fs from "fs";
import { execSync } from "child_process";
import puppeteer from "/Users/computer/.npm/_npx/9b026cc17ed3d82e/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const [fr, outp, initp, mode] = process.argv.slice(2);
let frames = []; for (const p of fr.split(",")) { if (p.includes("-")) { const [a, b] = p.split("-").map(Number); for (let i = a; i <= b; i++) frames.push(i); } else frames.push(Number(p)); }
const BOX0 = [560, 460, 960, 630], PAD = 40;
const txt = fs.readFileSync("../../src/shots/s18/data/feetA2.js", "utf8").replace("export const FEET_A2 =", "globalThis.FEET_A2 =");
eval(txt); let INIT = globalThis.FEET_A2; if (initp && fs.existsSync(initp)) INIT = { ...INIT, ...JSON.parse(fs.readFileSync(initp)) };
const OUT = fs.existsSync(outp) ? JSON.parse(fs.readFileSync(outp)) : {};
const browser = await puppeteer.launch({
  executablePath: "/Users/computer/.cache/puppeteer/chrome/mac_arm-138.0.7204.157/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  headless: true, args: ["--allow-file-access-from-files", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-first-run", "--disable-gpu-sandbox", "--disable-features=CanvasNoise"], protocolTimeout: 3600000,
});
const page = await browser.newPage();
page.on("console", (m) => { const t = m.text(); if (!t.includes("GPU stall") && !t.includes("willReadFrequently")) console.log("[page]", t); });
page.on("pageerror", (e) => console.log("[pageerror]", String(e)));
await page.goto("file://" + process.cwd() + "/fit.html", { timeout: 0, waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.title === "READY" || document.title === "FAIL", { timeout: 0 });
const PATH = {}; { const s = fs.readFileSync("../../src/shots/s18/shotA.js", "utf8"); const m = s.match(/PATH_A = (\[[\s\S]*?\]);/); for (const r of eval(m[1])) PATH[r[0]] = [r[1], r[2]]; }
function params(feet) {
  const P = [];
  feet.forEach((F, i) => {
    const a = F.a, h = F.h;
    P.push([i, ["a", 0], 6, a[0] - 45, a[0] + 45], [i, ["a", 1], 6, a[1] - 35, a[1] + 35]);
    // the shank's top lies on the belly's underside: its x, and a small offset from the edge
    if (h) { F._hx ??= h[0]; F._hdy ??= 2; P.push([i, ["_hx"], 6, F._hx - 40, F._hx + 40], [i, ["_hdy"], 3, -6, 10]); }
    P.push([i, ["th"], 8, F.th - 50, F.th + 50], [i, ["L"], 8, F.k === "C" ? 30 : 35, 95], [i, ["tw"], 1.5, 8, 14]);
    if (F.k === "C") P.push([i, ["curl"], 0.1, 0.15, 1], [i, ["spread"], 6, 10, 50]);
    else { P.push([i, ["fan"], 5, 4, 40], [i, ["bend"], 0.05, -0.15, 0.25]); if (F.back) P.push([i, ["back", 0], 10, F.back[0] - 60, F.back[0] + 60], [i, ["back", 1], 5, 10, 40]); }
    if (h) { F.lw ??= 12; F.lt ??= 20; P.push([i, ["lw"], 1.5, 10, 16], [i, ["lt"], 2, 16, 26]); }
    if (F.k === "B") { F.v ??= 85; P.push([i, ["v"], 20, 40, 235], [i, ["blur", 0], 6, -45, 45]); }
  });
  return P;
}
for (const f of frames) {
  const init = INIT[f]; if (!init) continue;
  const [dx, dy] = PATH[f], BOX = [...BOX0];
  BOX[2] = Math.min(BOX[2], 2206 - PAD - dx); BOX[0] = Math.max(BOX[0], PAD - dx);
  const W = BOX[2] - BOX[0] + 2 * PAD, H = BOX[3] - BOX[1] + 2 * PAD, x0 = BOX[0] + dx - PAD, y0 = BOX[1] + dy - PAD;
  const raw = execSync(`python3 -c "import cv2,sys;s=cv2.imread('../s18-fix2-src/f%04d.png'%${f},0);sys.stdout.buffer.write(s[${y0}:${y0 + H},${x0}:${x0 + W}].tobytes())"`, { maxBuffer: 1 << 24 });
  const info = await page.evaluate((f, b, s, w, h) => prep(f, b, s, w, h), f, BOX, raw.toString("base64"), W, H);
  const t0 = Date.now();
  let feet = JSON.parse(JSON.stringify(init)), res;
  for (const F of feet) if (F.h && F._hx == null) { F._hx = F.h[0]; F._hdy = 2; }
  const e0 = await page.evaluate((ft, b) => err(ft, b), feet, BOX);
  res = await page.evaluate((ft, P, b) => fit(ft, P, b), feet, params(feet), BOX);
  // second round from the result with fresh steps
  res = await page.evaluate((ft, P, b) => fit(ft, P, b), res.feet, params(res.feet), BOX);
  // try dropping each foot
  const eNo = [];
  for (let i = 0; i < res.feet.length; i++) { const ft = res.feet.filter((_, j) => j !== i); eNo.push(await page.evaluate((ft, b) => err(ft, b), ft, BOX)); }
  const eNone = await page.evaluate((b) => err([], b), BOX);
  OUT[f] = res.feet.map((F) => { const o = { ...F }; delete o._hx; delete o._hdy; return o; });
  console.log(f, "lut", JSON.stringify(info.lut.map((v) => Math.round(v))), "e0", e0.map((v) => v.toFixed(2)).join("/"), "->", res.e6.toFixed(2) + "/" + res.e2.toFixed(2), "drop", eNo.map((e) => e.map((v) => v.toFixed(2)).join("/")).join(" "), "none", eNone.map((v) => v.toFixed(2)).join("/"), "evals", res.nev, ((Date.now() - t0) / 1000).toFixed(0) + "s");
  fs.writeFileSync(outp, JSON.stringify(OUT));
}
await browser.close();
