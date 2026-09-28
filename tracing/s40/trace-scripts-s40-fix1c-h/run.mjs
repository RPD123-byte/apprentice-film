// node run.mjs outdir t1,t2,... [raw]
import puppeteer from "/Users/computer/.npm/_npx/668c188756b835f3/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js";
import fs from "fs"; import path from "path";
const [outdir, times, raw] = process.argv.slice(2);
fs.mkdirSync(outdir, { recursive: true });
setTimeout(() => { console.log("TIMEOUT"); process.exit(2); }, +(process.env.TMO || 90000));
const browser = await puppeteer.launch({
  executablePath: process.env.HOME + "/.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell",
  args: ["--allow-file-access-from-files", "--use-angle=metal", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage();
page.on("console", (m) => { const t = m.text(); if (!/Download the React/.test(t)) console.log("[page]", t); });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.setViewport({ width: 2206, height: 946 });
await page.goto("file://" + path.resolve("h.html"));
await page.waitForFunction("window.ready === true", { timeout: 60000 });
if (process.env.CARD) await page.evaluate(() => { window.cardOnly = true; });
for (const ts of times.split(",")) {
  const t = parseFloat(ts);
  const r = await page.evaluate((t, raw) => window.render(t, raw), t, !!raw);
  fs.writeFileSync(path.join(outdir, `r-${t.toFixed(3)}.png`), Buffer.from(r.url.split(",")[1], "base64"));
  console.log(t.toFixed(3), Math.round(r.ms) + " ms");
}
await browser.close();
process.exit(0);
