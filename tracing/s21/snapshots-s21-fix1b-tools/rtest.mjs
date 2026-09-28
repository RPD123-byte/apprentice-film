import puppeteer from "/Users/computer/.npm/_npx/37e1042021ea9743/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import path from "path";
const exe = "/Users/computer/.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const b = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--allow-file-access-from-files", "--use-angle=metal", "--enable-webgl", "--ignore-gpu-blocklist"] });
const p = await b.newPage(); await p.setViewport({ width: 2206, height: 946 });
await p.goto("file://" + path.resolve("/Users/computer/rootline/apprentice-film/snapshots/s21-fix1b-tools/harness.html"));
await p.waitForFunction("window.ready === true", { timeout: 120000 });
const U = { t: 0.04 }, up = { u: 0.546, v: 0.128, rx: 0.19, ry: 0.16, rot: 0.35, t: 0.04 };
const cands = [
  ["round3", { u: 0.63, v: -0.19, rx: 0.26, ry: 0.115 }], ["new", { u: 0.58, v: -0.27, rx: 0.205, ry: 0.11 }],
  ["u.60v-.23", { u: 0.60, v: -0.23, rx: 0.23, ry: 0.115 }], ["u.63v-.23", { u: 0.63, v: -0.23, rx: 0.24, ry: 0.115 }],
  ["u.58v-.21", { u: 0.58, v: -0.21, rx: 0.22, ry: 0.11 }], ["u.62v-.26", { u: 0.62, v: -0.26, rx: 0.22, ry: 0.11 }],
];
for (const [n, c] of cands) {
  let tot = 0, s = [];
  for (const t of [73.6, 74.0, 74.4]) {
    const r = await p.evaluate((t, c, up) => window.score(t, { ringsCut: [{ ...c, rot: -0.41, t: 0.056 }, up] }, [290, 110, 470, 190], 1.5), t, c, up);
    tot += r.mae; s.push(r.mae.toFixed(1) + "/" + r.ncc.toFixed(3));
  }
  console.log(n, (tot / 3).toFixed(2), s.join(" "));
}
await b.close();
