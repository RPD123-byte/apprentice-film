import fs from "fs"; import path from "path";
const puppeteer = (await import("/Users/computer/.npm/_npx/37e1042021ea9743/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js")).default;
const ROOT = "/Users/computer/rootline/apprentice-film";
const types = { ".html": "text/html", ".js": "text/javascript", ".woff2": "font/woff2", ".ttf": "font/ttf" };
for (const exe of ["/Users/computer/.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell","/Users/computer/.cache/puppeteer/chrome/mac_arm-138.0.7204.157/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"]) {
  const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox","--use-gl=angle","--use-angle=metal","--enable-gpu-rasterization","--force-color-profile=srgb"], protocolTimeout: 120000 });
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on("request", (r) => { const u = new URL(r.url()); if (u.hostname !== "local") return r.abort(); const f = path.join(ROOT, decodeURIComponent(u.pathname)); if (!fs.existsSync(f)) return r.respond({ status: 404, body: "nf" }); r.respond({ status: 200, contentType: types[path.extname(f)] || "application/octet-stream", body: fs.readFileSync(f) }); });
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  page.goto("http://local/snapshots/s08-fix1-tools/dbg.html").catch(()=>{});
  await page.waitForFunction("window.__done===true", { timeout: 90000 });
  console.log(exe.includes("131")?"131":"138", await page.evaluate(()=>window.__info));
  await browser.close();
}
