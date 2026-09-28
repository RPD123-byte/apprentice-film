// node run.mjs OUTDIR t1,t2,... [--raw] [--mod path] -> OUTDIR/r-<t>.png (+ timing)
import puppeteer from "/Users/computer/.npm/_npx/37e1042021ea9743/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import fs from "fs"; import path from "path";
const [out, ts, ...rest] = process.argv.slice(2);
const raw = rest.includes("--raw");
const mi = rest.indexOf("--mod"); const mod = mi >= 0 ? rest[mi + 1] : "";
fs.mkdirSync(out, { recursive: true });
const exe = "/Users/computer/.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const b = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--allow-file-access-from-files", "--use-angle=metal", "--enable-webgl", "--ignore-gpu-blocklist"] });
const p = await b.newPage();
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("[page]", m.text()); });
p.on("pageerror", (e) => console.log("[pageerror]", e.message));
await p.setViewport({ width: 2206, height: 946 });
await p.goto("file://" + path.resolve("/Users/computer/rootline/apprentice-film/snapshots/s21-r3-tools/harness.html") + (mod ? "#" + mod : ""));
await p.waitForFunction("window.ready === true", { timeout: 120000 });
const pi = rest.indexOf("--pose");
if (pi >= 0) { const po = JSON.parse(fs.readFileSync(rest[pi + 1], "utf8")); await p.evaluate((po) => { window.__mod.DBG.pose = po; }, po); }
const si = rest.indexOf("--set");
if (si >= 0) { const kv = Object.fromEntries(rest[si + 1].split(",").map((x) => { const [k, v] = x.split("="); return [k, Number(v)]; })); await p.evaluate((kv) => Object.assign(window.__mod.DBG, kv), kv); }
for (const t of ts.split(",").map(Number)) {
  const r = await p.evaluate((t, raw) => window.render(t, !raw), t, raw);
  fs.writeFileSync(`${out}/r-${t.toFixed(2)}.png`, Buffer.from(r.url.split(",")[1], "base64"));
  console.log(t.toFixed(2), r.dt.toFixed(0) + "ms");
}
await b.close();
