// node perf.mjs module frames reps -> per-frame draw ms (first pass = with cache builds, then best of reps)
import puppeteer from "/Users/computer/.npm/_npx/9b026cc17ed3d82e/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
const [mod, fr, reps = "2"] = process.argv.slice(2);
const frames = []; for (const p of fr.split(",")) { if (p.includes("-")) { const [a, b] = p.split("-").map(Number); for (let i = a; i <= b; i++) frames.push(i); } else frames.push(Number(p)); }
const browser = await puppeteer.launch({ executablePath: "/Users/computer/.cache/puppeteer/chrome/mac_arm-138.0.7204.157/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  headless: true, userDataDir: "/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/f18/prof", args: ["--allow-file-access-from-files", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-features=CanvasNoise"], protocolTimeout: 3600000 });
const page = await browser.newPage();
await page.goto("file:///Users/computer/rootline/apprentice-film/snapshots/s18-fix1r-h/h.html?m=" + encodeURIComponent(mod));
await page.waitForFunction(() => document.title === "READY", { timeout: 600000 });
const first = await page.evaluate((l) => window.timeFrames(l), frames);
let best = first.map(([n, v]) => [n, v]);
for (let r = 1; r < Number(reps); r++) { const t = await page.evaluate((l) => window.timeFrames(l), frames); best = best.map(([n, v], i) => [n, Math.min(v, t[i][1])]); }
console.log("ALL " + JSON.stringify(first.map(([n, v]) => [n, Math.round(v)])));
const f = first.slice(0, 3).map(([n, v]) => `${n}:${v.toFixed(0)}`).join(" ");
const s = [...best].sort((a, b) => b[1] - a[1]);
console.log(`first-draws ${f} | steady mean ${(best.reduce((a, x) => a + x[1], 0) / best.length).toFixed(1)} ms, slowest ${s.slice(0, 6).map(([n, v]) => `${n}:${v.toFixed(0)}`).join(" ")}`);
await browser.close();
