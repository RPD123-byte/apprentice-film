// Per-frame draw timing for s24 in headless Chrome (no server: requests to http://s24.local/ are answered from disk
// by request interception). Usage: node timing.mjs 12,40,75
import puppeteer from "/Users/computer/.npm/_npx/668c188756b835f3/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js";
import fs from "fs"; import path from "path";
const ROOT = "/Users/computer/rootline/apprentice-film";
const ks = (process.argv[2] || "12,40,75").split(",").map(Number);
const html = `<!doctype html><html><body><canvas id=c width=2206 height=946></canvas><script type=module>
import { shot } from "/src/shots/s24.js";
const ctx = document.getElementById("c").getContext("2d");
window.run = (k, n) => { const t = 96.8 + 0.04 * k; const out = [];
  for (let i = 0; i < n; i++) { const t0 = performance.now(); ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle="#000"; ctx.fillRect(0,0,2206,946);
    ctx.save(); shot.draw(ctx, t - 97.08, t); ctx.restore(); ctx.getImageData(0, 0, 1, 1); out.push(performance.now() - t0); }
  return out; };
import { drawLines, toneLayer } from "/src/shots/s24/vec.js";
import { LINES_F, OWL_F } from "/src/shots/s24/dataF.js";
window.parts = () => { const r = {}; const T = (name, f, n = 5) => { f(); const t0 = performance.now(); for (let i = 0; i < n; i++) { f(); ctx.getImageData(0, 0, 1, 1); } r[name] = ((performance.now() - t0) / n).toFixed(1); };
  T("fill", () => { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 2206, 946); });
  T("lines crisp", () => drawLines(ctx, LINES_F[40], { soft: 0 }));
  T("lines soft", () => drawLines(ctx, LINES_F[40]));
  const L = toneLayer(OWL_F, null, { soft: 0.6 });
  T("owl blit", () => ctx.drawImage(L.canvas, L.x, L.y));
  const big = document.createElement("canvas"); big.width = 1103; big.height = 473;
  T("upscale src-over", () => { ctx.drawImage(big, 0, 0, 2206, 946); });
  T("upscale lighten", () => { ctx.save(); ctx.globalCompositeOperation = "lighten"; ctx.drawImage(big, 0, 0, 2206, 946); ctx.restore(); });
  return r; };
import { PAGE_B1, PAGE_B2, PAGE_B3, HOLD } from "/src/shots/s24/dataPage.js";
import { CONFETTI } from "/src/shots/s24/shards.js";
window.parts2 = () => { const r = {}; const T = (name, f, n = 5) => { f(); const t0 = performance.now(); for (let i = 0; i < n; i++) { f(); ctx.getImageData(0, 0, 1, 1); } r[name] = ((performance.now() - t0) / n).toFixed(1); };
  const big = document.createElement("canvas"); big.width = 2206; big.height = 946; big.getContext("2d").fillRect(0,0,10,10);
  const big2 = document.createElement("canvas"); big2.width = 2206; big2.height = 946; big2.getContext("2d", { willReadFrequently: true }).fillRect(0,0,10,10);
  T("blit full (gpu canvas?)", () => ctx.drawImage(big, 0, 0));
  T("blit full (cpu canvas)", () => ctx.drawImage(big2, 0, 0));
  const Ls = [PAGE_B1, PAGE_B2, PAGE_B3].map((d) => toneLayer(d, null, { soft: 0.8 }));
  T("3 layers", () => { for (const L of Ls) ctx.drawImage(L.canvas, L.x + 0.3, L.y + 0.2); });
  T("confetti", () => { CONFETTI.forEach(([x, y, w, h, a]) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = "#eee"; ctx.fillRect(-w/2,-h/2,w,h); ctx.strokeStyle="#111"; ctx.lineWidth=1.4; ctx.strokeRect(-w/2,-h/2,w,h); ctx.restore(); }); });
  return r; };
window.ready = true;
</script></body></html>`;
const browser = await puppeteer.launch({ headless: "shell", args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
const page = await browser.newPage();
await page.setRequestInterception(true);
const types = { ".js": "text/javascript", ".html": "text/html", ".json": "application/json", ".woff2": "font/woff2", ".ttf": "font/ttf" };
page.on("request", (r) => {
  const u = new URL(r.url());
  if (u.host !== "s24.local") return r.abort();
  if (u.pathname === "/") return r.respond({ status: 200, contentType: "text/html", body: html });
  const f = path.join(ROOT, decodeURIComponent(u.pathname));
  if (!fs.existsSync(f)) return r.respond({ status: 404, body: "" });
  r.respond({ status: 200, contentType: types[path.extname(f)] || "application/octet-stream", body: fs.readFileSync(f) });
});
page.on("console", (m) => { if (m.type() === "error") console.log("console:", m.text()); });
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto("http://s24.local/");
await page.waitForFunction("window.ready === true", { timeout: 120000 });
console.log(JSON.stringify(await page.evaluate(() => window.parts2())));
for (const k of ks) {
  const t = await page.evaluate((k) => window.run(k, 6), k);
  console.log(`k${k}: first ${t[0].toFixed(0)} ms, then ${t.slice(1).map((v) => v.toFixed(0)).join(" ")} ms`);
}
await browser.close();
