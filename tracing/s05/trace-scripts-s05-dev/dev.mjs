// Dev harness (scratch): render a project-relative test page in headless Chrome (files served by request
// interception, no server) and screenshot the #c canvas. Several renders per browser launch.
// Usage: node dev.mjs snapshots/s08-dev/x.built.html out1.png "query1" [out2.png "query2" ...]
import fs from "fs"; import path from "path";
const puppeteer = (await import("/Users/computer/.npm/_npx/37e1042021ea9743/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js")).default;
const ROOT = "/Users/computer/rootline/apprentice-film";
const [page_, ...rest] = process.argv.slice(2);
const jobs = []; for (let i = 0; i < rest.length; i += 2) jobs.push([rest[i], rest[i + 1] || ""]);
const exe = "/Users/computer/.cache/puppeteer/chrome/mac_arm-138.0.7204.157/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox"], protocolTimeout: 120000 });
const types = { ".html": "text/html", ".js": "text/javascript", ".woff2": "font/woff2", ".ttf": "font/ttf", ".png": "image/png", ".json": "application/json" };
for (const [out, q] of jobs) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 2206, height: 946 });
      await page.setRequestInterception(true);
      page.on("request", (r) => {
        const u = new URL(r.url());
        if (u.hostname !== "local") return r.abort();
        const f = path.join(ROOT, decodeURIComponent(u.pathname));
        if (!fs.existsSync(f)) return r.respond({ status: 404, body: "nf" });
        r.respond({ status: 200, contentType: types[path.extname(f)] || "application/octet-stream", body: fs.readFileSync(f) });
      });
      page.on("pageerror", (e) => console.log("[pageerror]", e.message));
      page.on("console", (m) => { if (!/404/.test(m.text())) console.log("[page]", m.text()); });
      const t0 = Date.now();
      page.goto(`http://local/${page_}${q ? "?" + q : ""}`, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
      await page.waitForFunction("window.__done === true", { timeout: 60000 });
      const [cw, ch] = await page.evaluate(() => { const c = document.getElementById("c"); return [c.width, c.height]; });
      await page.setViewport({ width: cw, height: ch });
      await page.screenshot({ path: out, clip: { x: 0, y: 0, width: cw, height: ch } });
      console.log("saved", out, (Date.now() - t0) + "ms", await page.evaluate(() => window.__info || ""));
      await page.close();
      break;
    } catch (e) { console.log("retry", out, e.message.slice(0, 80)); try { await page.close(); } catch {} }
  }
}
await browser.close();
