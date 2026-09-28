// node jstest.mjs "<js expression body run in page, returns JSON-able>"
import { createRequire } from "module";
const require = createRequire("/Users/computer/.npm/_npx/ab5cd9f6d13a2312/node_modules/");
const puppeteer = require("puppeteer");
const browser = await puppeteer.launch({ headless: "new", protocolTimeout: 1800000, args: ["--allow-file-access-from-files", "--disable-web-security", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=metal"] });
const page = await browser.newPage();
page.on("console", (m) => console.log("console:", m.text().slice(0, 400)));
await page.goto("file:///Users/computer/rootline/apprentice-film/index.html", { waitUntil: "load", timeout: 120000 });
await page.waitForFunction(() => window.__film, { timeout: 120000 });
const body = process.argv[2];
const r = await page.evaluate(new Function("return (async () => {" + body + "})()"));
console.log(JSON.stringify(r));
await browser.close();
