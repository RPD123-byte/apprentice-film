import puppeteer from "/Users/computer/.npm/_npx/668c188756b835f3/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js";
import fs from "fs"; import path from "path";
const browser = await puppeteer.launch({ executablePath: process.env.HOME + "/.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell", args: ["--allow-file-access-from-files"] });
const page = await browser.newPage();
await page.goto("file://" + path.resolve("owlmask.html"));
await page.waitForFunction("window.ready === true", { timeout: 60000 });
const url = await page.evaluate(() => window.url);
fs.writeFileSync("owlmask.png", Buffer.from(url.split(",")[1], "base64"));
await browser.close(); process.exit(0);
