import puppeteer from "/Users/computer/.npm/_npx/668c188756b835f3/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js";
import fs from "fs"; import path from "path";
const browser = await puppeteer.launch({
  executablePath: process.env.HOME + "/.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell",
  args: ["--allow-file-access-from-files", "--use-angle=metal", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.setViewport({ width: 2206, height: 946 });
await page.goto("file://" + path.resolve("h.html"));
await page.waitForFunction("window.ready === true", { timeout: 60000 });
const url = await page.evaluate(async () => { const card = await import("../../src/shots/s40/card.js"); return card.buildMask().toDataURL("image/png"); });
fs.writeFileSync("mask.png", Buffer.from(url.split(",")[1], "base64"));
await browser.close(); process.exit(0);
