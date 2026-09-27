import fs from "fs"; import path from "path";
const puppeteer = (await import("/Users/computer/.npm/_npx/37e1042021ea9743/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js")).default;
for (const exe of ["/Users/computer/.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell","/Users/computer/.cache/puppeteer/chrome/mac_arm-138.0.7204.157/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"]) {
  const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox","--use-gl=angle","--use-angle=metal","--enable-gpu-rasterization"] });
  const page = await browser.newPage();
  await page.goto("file:///Users/computer/rootline/apprentice-film/snapshots/s08-fix1-tools/t131.html");
  await page.waitForFunction("window.__done===true");
  console.log(exe.includes("131")?"131":"138", await page.evaluate(()=>window.__res));
  await browser.close();
}
