import puppeteer from "/Users/computer/.npm/_npx/668c188756b835f3/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js";
import path from "path";
const browser = await puppeteer.launch({ executablePath: process.env.HOME + "/.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell", args: ["--allow-file-access-from-files", "--use-angle=metal", "--enable-webgl", "--ignore-gpu-blocklist"] });
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.goto("file://" + path.resolve(process.argv[2] || "gt.html"));
await page.waitForFunction("window.ready === true", { timeout: 60000 });
console.log(JSON.stringify(await page.evaluate(() => window.res)));
await browser.close(); process.exit(0);
