import { createRequire } from "module";
const require = createRequire("/Users/computer/.npm/_npx/ab5cd9f6d13a2312/node_modules/");
const puppeteer = require("puppeteer");
const browser = await puppeteer.launch({ headless: "new", protocolTimeout: 900000, args: ["--allow-file-access-from-files", "--disable-web-security", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=metal"] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 600 });
page.on("console", (m) => { if (m.type() === "error") console.log("console:", m.text()); });
await page.goto("file:///Users/computer/rootline/apprentice-film/index.html", { waitUntil: "load", timeout: 60000 });
await page.waitForFunction(() => window.__film, { timeout: 60000 });
const times = process.argv.slice(2).map(Number);
for (const t of times) { const w = await page.evaluate((t) => { const a = performance.now(); window.__film.renderAt(t); return performance.now() - a; }, t); console.log("warm", t, w.toFixed(0)); }
const res = [];
for (const t of times) res.push(await page.evaluate((t) => { const a = performance.now(); window.__film.renderAt(t); window.__film.renderAt(t + 0.04); return [t, +((performance.now() - a) / 2).toFixed(1)]; }, t));
console.log(JSON.stringify(res));
await browser.close();
