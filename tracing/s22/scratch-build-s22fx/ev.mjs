// evaluate an async JS function body file in the film page (index.html loaded, modules importable via imp(path))
// usage: node ev.mjs script.js [arg-json]; the script body gets (imp, arg) and may return {json, images:{name:dataURL}}
import { createRequire } from "module";
import fs from "fs";
const require = createRequire("/Users/computer/.npm/_npx/ab5cd9f6d13a2312/node_modules/");
const puppeteer = require("puppeteer");
const [script, argJson, outDir = "/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s22fx/ev"] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const body = fs.readFileSync(script, "utf8");
const browser = await puppeteer.launch({ headless: "new", protocolTimeout: 1800000, args: ["--allow-file-access-from-files", "--disable-web-security", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=metal"] });
const page = await browser.newPage();
await page.setViewport({ width: 2206, height: 946 });
page.on("console", (m) => console.log("console:", m.type(), m.text().slice(0, 2000)));
page.on("pageerror", (e) => console.log("pageerror:", String(e).slice(0, 500)));
await page.goto("file:///Users/computer/rootline/apprentice-film/index.html", { waitUntil: "load", timeout: 90000 });
await page.waitForFunction(() => window.__film, { timeout: 90000 });
const res = await page.evaluate(async (body, argJson) => {
  const imp = (p) => import(new URL(p, location.href).href + "?v=" + Math.random());
  const fn = new Function("imp", "arg", "return (async () => {" + body + "})()");
  return await fn(imp, argJson ? JSON.parse(argJson) : null);
}, body, argJson || "");
if (res && res.images) for (const [k, v] of Object.entries(res.images)) fs.writeFileSync(`${outDir}/${k}.png`, Buffer.from(v.split(",")[1], "base64"));
if (res && res.json !== undefined) console.log(JSON.stringify(res.json));
await browser.close();
