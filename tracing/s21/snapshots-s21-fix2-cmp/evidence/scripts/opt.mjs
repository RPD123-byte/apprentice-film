// node opt.mjs spec.json -> coordinate descent of pose overrides against the source (NCC in windows)
// spec: { pose: "WALK", frames: [t...], win: [hw, hh] | per-frame [[x0,y0,x1,y1]...], anchor: "head", params: [{path, step, min, max}], rounds, sigma, base: {extra overrides} }
import puppeteer from "/Users/computer/.npm/_npx/37e1042021ea9743/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import fs from "fs"; import path from "path";
const spec = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const exe = "/Users/computer/.cache/puppeteer/chrome-headless-shell/mac_arm-131.0.6778.204/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const b = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--allow-file-access-from-files", "--use-angle=metal", "--enable-webgl", "--ignore-gpu-blocklist"] });
const p = await b.newPage();
p.on("pageerror", (e) => console.log("[pageerror]", e.message));
await p.setViewport({ width: 2206, height: 946 });
await p.goto("file://" + path.resolve("/Users/computer/rootline/apprentice-film/snapshots/s21-fix2-tools/harness.html"));
await p.waitForFunction("window.ready === true", { timeout: 120000 });
const get = (o, path) => path.split(".").reduce((a, k) => (a == null ? undefined : a[k]), o);
const setp = (o, path, v) => { const ks = path.split("."); let a = o; for (let i = 0; i < ks.length - 1; i++) { const k = ks[i], nk = ks[i + 1]; if (a[k] == null) a[k] = /^\d+$/.test(nk) ? [] : {}; a = a[k]; } a[ks[ks.length - 1]] = v; };
const pose0 = await p.evaluate((n) => JSON.parse(JSON.stringify(window.__poses[n] ?? {})), spec.pose);
const vals = spec.params.map((q) => q.init ?? get(pose0, q.path) ?? 0);
// windows from the probe at the initial state
const WS = spec.windows || [{ anchor: spec.anchor || "head", win: spec.win, off: spec.winOff, weight: 1 }];
const wins = [];
for (const t of spec.frames) {
  const pr = await p.evaluate((t) => window.__mod.probe(t), t);
  wins.push(WS.map((W) => { const c = pr[W.anchor], [hw, hh] = W.win, [ox, oy] = W.off || [0, 0]; return { w: W.weight ?? 1, r: [Math.round(c[0] - hw + ox), Math.round(c[1] - hh + oy), Math.round(c[0] + hw + ox), Math.round(c[1] + hh + oy)] }; }));
}
function build(v) {
  const o = JSON.parse(JSON.stringify(spec.base || {}));
  // arrays in the pose (e.g. head.off) must be complete: seed them from the pose
  for (const q of spec.params) { const top = q.path.split(".").slice(0, -1).join("."); const cur = get(pose0, top); if (Array.isArray(cur) && get(o, top) == null) setp(o, top, [...cur]); }
  spec.params.forEach((q, i) => setp(o, q.path, v[i]));
  return { pose: { [spec.pose]: o } };
}
async function cost(v) {
  let c = 0;
  for (let i = 0; i < spec.frames.length; i++) {
    let ws = 0;
    for (const W of wins[i]) {
      const r = await p.evaluate((t, d, w, s) => window.score(t, d, w, s), spec.frames[i], build(v), W.r, spec.sigma || 1.2);
      c += W.w * ((1 - r.ncc) + (spec.maeW || 0) * r.mae / 100); ws += W.w;
    }
    c /= ws;
  }
  return c / spec.frames.length;
}
let best = await cost(vals), steps = spec.params.map((q) => q.step);
console.log("start", best.toFixed(5), JSON.stringify(vals.map((x) => +x.toFixed(4))));
for (let r = 0; r < (spec.rounds || 6); r++) {
  let improved = false;
  for (let i = 0; i < vals.length; i++) {
    for (const dir of [1, -1]) {
      const v = [...vals]; v[i] = Math.min(spec.params[i].max ?? 1e9, Math.max(spec.params[i].min ?? -1e9, v[i] + dir * steps[i]));
      const c = await cost(v);
      if (c < best - 1e-5) { best = c; vals[i] = v[i]; improved = true; break; }
    }
  }
  console.log("round", r, best.toFixed(5), JSON.stringify(vals.map((x) => +x.toFixed(4))), "steps", JSON.stringify(steps.map((x) => +x.toFixed(4))));
  if (!improved) steps = steps.map((s) => s / 2);
}
console.log("RESULT", JSON.stringify(Object.fromEntries(spec.params.map((q, i) => [q.path, +vals[i].toFixed(4)]))));
await b.close();
