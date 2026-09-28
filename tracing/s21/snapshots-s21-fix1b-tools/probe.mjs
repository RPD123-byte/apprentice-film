// node probe.mjs t1,t2,... [fn=probe] -> JSON lines of the shot's probe(t)
import puppeteer from "/Users/computer/.npm/_npx/37e1042021ea9743/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import path from "path";
const [ts, fn = "probe"] = process.argv.slice(2);
const exe = "/Users/computer/.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const b = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--allow-file-access-from-files", "--use-angle=metal", "--enable-webgl", "--ignore-gpu-blocklist"] });
const p = await b.newPage();
p.on("pageerror", (e) => console.log("[pageerror]", e.message));
await p.goto("file://" + path.resolve("/Users/computer/rootline/apprentice-film/snapshots/s21-fix1b-tools/harness.html"));
await p.waitForFunction("window.ready === true", { timeout: 120000 });
for (const t of ts.split(",").map(Number)) console.log(JSON.stringify(await p.evaluate((t, fn) => window.__mod[fn](t), t, fn)));
await b.close();
