import { createRequire } from "module";
const require = createRequire("/Users/computer/.npm/_npx/ab5cd9f6d13a2312/node_modules/");
const puppeteer = require("puppeteer");
const browser = await puppeteer.launch({ headless: "new", protocolTimeout: 600000, args: ["--allow-file-access-from-files", "--disable-web-security", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=metal"] });
const page = await browser.newPage();
page.on("console", (m) => console.log("console:", m.text()));
await page.goto("file:///Users/computer/rootline/apprentice-film/index.html", { waitUntil: "load", timeout: 60000 });
await page.waitForFunction(() => window.__film, { timeout: 60000 });
const r = await page.evaluate(async () => {
  const base = new URL("./src/shots/", location.href).href;
  const R = await import(base + "s04/room.js");
  const W = await import(base + "s04/world02.js");
  const c = document.createElement("canvas"); c.width = 2206; c.height = 946; const g = c.getContext("2d");
  const out = {};
  const T = (name, f) => { const a = performance.now(); f(); out[name] = (out[name] || []).concat(+(performance.now() - a).toFixed(1)); };
  for (const t of [20.9, 20.94, 21.2, 20.9]) {
    const cam = R.camAt(t);
    T("room" + t, () => R.drawRoom(g, cam, R.roomBlur(t), R.roomGain(t)));
    T("backdrop" + t, () => R.drawBackdrop(g, cam, t, W.room02(), W.HOLD));
    T("laptop" + t, () => R.drawLaptop(g, cam, t));
  }
  window.__film.renderAt(20.9);
  T("full20.9", () => window.__film.renderAt(20.9));
  T("full21.0", () => window.__film.renderAt(21.0));
  T("full21.12", () => window.__film.renderAt(21.12));
  return out;
});
console.log(JSON.stringify(r));
await browser.close();
