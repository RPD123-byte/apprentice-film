import puppeteer from "/Users/computer/.npm/_npx/668c188756b835f3/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js";
import path from "path";
const browser = await puppeteer.launch({ executablePath: process.env.HOME + "/.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell", args: ["--allow-file-access-from-files", "--use-angle=metal", "--enable-webgl", "--ignore-gpu-blocklist"] });
const page = await browser.newPage();
await page.setViewport({ width: 2206, height: 946 });
await page.goto("file://" + path.resolve("h2.html"));
await page.waitForFunction("window.ready === true", { timeout: 60000 });
const r = await page.evaluate(() => { window.noenc = true;
  const t0 = performance.now(); window.render(138.0); const first = performance.now() - t0;
  const out = document.getElementById("film"); const gl = out.getContext("webgl"); const px = new Uint8Array(4);
  const t1 = performance.now();
  for (let i = 1; i <= 20; i++) { window.render(138.0 + i * 0.04); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
  const per = (performance.now() - t1) / 20;
  const t2 = performance.now();
  for (let i = 1; i <= 10; i++) { window.render(136.2 + i * 0.04); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
  const perDis = (performance.now() - t2) / 10;
  return { first, per, perDis };
});
console.log(JSON.stringify(r));
await browser.close(); process.exit(0);
