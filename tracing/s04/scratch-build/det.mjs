import { createRequire } from "module";
import fs from "fs";
const require = createRequire("/Users/computer/.npm/_npx/ab5cd9f6d13a2312/node_modules/");
const puppeteer = require("puppeteer");
const browser = await puppeteer.launch({ headless: "new", protocolTimeout: 600000, args: ["--allow-file-access-from-files", "--disable-web-security", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=metal"] });
async function run(seq, target) {
  const page = await browser.newPage();
  page.on("console", (m) => { console.log("console:", m.type(), m.text().slice(0, 300)); });
  await page.goto("file:///Users/computer/rootline/apprentice-film/index.html", { waitUntil: "load", timeout: 60000 });
  await page.waitForFunction(() => window.__film, { timeout: 60000 });
  const url = await page.evaluate(async (seq, target) => {
    const S = (await import(new URL("./src/shots/s04.js", location.href).href)).shot;
    const c = document.createElement("canvas"); c.width = 2206; c.height = 946; const g = c.getContext("2d");
    for (const t of [...seq, target]) { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#000"; g.fillRect(0, 0, 2206, 946); S.draw(g, t - 19.12, t); }
    return c.toDataURL("image/png");
  }, seq, target);
  await page.close();
  return Buffer.from(url.split(",")[1], "base64");
}
const [T, ...seqs] = process.argv.slice(2);
let i = 0;
for (const s of seqs) { const seq = s === "-" ? [] : s.split(",").map(Number); fs.writeFileSync(`/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/det-${i++}.png`, await run(seq, +T)); }
await browser.close();
