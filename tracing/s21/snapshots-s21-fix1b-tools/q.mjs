import puppeteer from "/Users/computer/.npm/_npx/37e1042021ea9743/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import path from "path";
const exe = "/Users/computer/.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const b = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--allow-file-access-from-files", "--use-angle=metal", "--enable-webgl", "--ignore-gpu-blocklist"] });
const p = await b.newPage();
await p.goto("file://" + path.resolve("harness.html"));
await p.waitForFunction("window.ready === true", { timeout: 120000 });
console.log(await p.evaluate(process.argv[2]));
await b.close();
