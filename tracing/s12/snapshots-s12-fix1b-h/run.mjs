// node run.mjs outdir t1,t2,... [raw]  -> outdir/r-<t>.png (graded, or raw pre-grade layer with 'raw')
import puppeteer from "/Users/computer/.npm/_npx/fadd01e97075bd25/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import fs from "fs"; import path from "path";
const [,, outdir, times, mode] = process.argv;
fs.mkdirSync(outdir, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.HOME + "/.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell",
  args: ["--allow-file-access-from-files", "--use-angle=metal", "--enable-webgl", "--ignore-gpu-blocklist"], protocolTimeout: 600000 });
const page = await browser.newPage();
page.on("console", (m) => console.log("[page]", m.text()));
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.setViewport({ width: 2206, height: 946 });
await page.goto("file://" + path.resolve("/Users/computer/rootline/apprentice-film/snapshots/s12-fix1b-h/harness.html"));
await page.waitForFunction("window.ready === true", { timeout: 120000 });
for (const t of times.split(",")) {
  const r = await page.evaluate((t, raw) => window.renderAt(+t, raw), t, mode === "raw");
  fs.writeFileSync(path.join(outdir, `${mode === "raw" ? "raw" : "r"}-${t}.png`), Buffer.from(r.url.split(",")[1], "base64"));
  console.log(t, Math.round(r.ms), "ms");
}
await browser.close();
