#!/usr/bin/env node
// Purity audit: every shot's draw must be a pure function of time (the same t gives the same pixels whatever was drawn
// before). This renders every frame from T0 to T1 three times in one page — in order, in a scrambled order, in order
// again — hashes every pixel of the graded canvas each time (SHA-1), and reports, grouped by shot, the frames that are
// unstable (the two in-order draws differ) and the frames that depend on draw order (stable, but differ when scrambled).
//
//   node tools/harness/purity.mjs [T0 T1] [--json out.json] [--baseline base.json]
//   e.g. node tools/harness/purity.mjs 0 140.76 --json snapshots/purity.json
// --json saves every frame's in-order and scrambled hash; --baseline compares this run's in-order hashes with a saved
// run, so a fix that makes a shot order-independent can prove it did not change what the in-order render draws.
import fs from "node:fs";
import path from "node:path";
import { openFilm, FPS, ROOT } from "./film.mjs";

const args = process.argv.slice(2);
const jsonAt = args.indexOf("--json");
const jsonOut = jsonAt >= 0 ? args.splice(jsonAt, 2)[1] : null;
const cpuAt = args.indexOf("--cpu-canvas");
const cpuCanvas = cpuAt >= 0 ? (args.splice(cpuAt, 1), true) : false;
const baseAt = args.indexOf("--baseline");
const baseIn = baseAt >= 0 ? args.splice(baseAt, 2)[1] : null;
const T0 = args[0] !== undefined ? +args[0] : 0;
const T1 = args[1] !== undefined ? +args[1] : 140.76;
const F0 = Math.round(T0 * FPS), F1 = Math.round(T1 * FPS);
const frames = [];
for (let f = F0; f <= F1; f++) frames.push(f);

// shot table, for grouping
const plan = [...fs.readFileSync(path.join(ROOT, "src/shots/index.js"), "utf8")
  .matchAll(/\["(s\d+)",\s*([\d.]+),\s*([\d.]+)/g)].map((m) => [m[1], +m[2], +m[3]]);
const shotOf = (t) => (plan.find(([, a, b]) => t >= a && t < b) || ["s40"])[0];

// --cpu-canvas: create every 2D canvas with willReadFrequently, so Chrome rasterizes it on the CPU from the start instead
// of switching it from GPU to CPU part-way through after repeated getImageData readbacks (an experiment switch).
const beforeLoad = cpuCanvas ? (page) => page.evaluateOnNewDocument(() => {
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    return orig.call(this, type, type === "2d" ? { ...(attrs || {}), willReadFrequently: true } : attrs);
  };
}) : undefined;
const { browser, page, loadSeconds } = await openFilm({ beforeLoad });
if (cpuCanvas) console.log("--cpu-canvas: every 2D canvas uses willReadFrequently");
console.log(`loaded in ${loadSeconds.toFixed(1)} s; ${frames.length} frames, two passes`);
// 64-bit hash (two FNV-1a lanes) of every pixel of the graded canvas, read back from the WebGL grade
await page.evaluate(() => {
  window.__hashAt = (t) => {
    window.__film.renderAt(t);
    const c = document.getElementById("film");
    const g = c.getContext("webgl") || c.getContext("webgl2");
    if (!g || g.isContextLost()) return "CONTEXT-LOST";
    const px = new Uint8Array(c.width * c.height * 4);
    g.readPixels(0, 0, c.width, c.height, g.RGBA, g.UNSIGNED_BYTE, px);
    const u = new Uint32Array(px.buffer);
    let h1 = 2166136261 >>> 0, h2 = 0x9e3779b9 >>> 0;
    for (let i = 0; i < u.length; i++) { h1 = Math.imul(h1 ^ u[i], 16777619) >>> 0; h2 = Math.imul(h2 ^ u[i], 0x5bd1e995) >>> 0; }
    return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
  };
});
const hashAll = async (order, label) => {
  const out = new Map();
  const t0 = Date.now();
  for (let i = 0; i < order.length; i += 25) {
    const chunk = order.slice(i, i + 25);
    const hs = await page.evaluate((fs, fps) => fs.map((f) => window.__hashAt(f / fps)), chunk, FPS);
    chunk.forEach((f, k) => out.set(f, hs[k]));
    if (i % 500 === 0) process.stdout.write(`\r${label}: ${i}/${order.length}`);
  }
  console.log(`\r${label}: ${order.length}/${order.length} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  return out;
};
let seq, scr, seq2;
try {
  seq = await hashAll(frames, "in order");
  // scrambled order: shots visited last-to-first, and inside each shot the frames permuted by a stride coprime with its
  // length. This catches a shot depending on its own frame order or on which shot was drawn before it, while building
  // each shot's caches only once per pass (a fully random order rebuilds them on every frame and takes ~30 min).
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const groups = [];
  for (const f of frames) { const id = shotOf(f / FPS); if (!groups.length || groups[groups.length - 1].id !== id) groups.push({ id, fs: [] }); groups[groups.length - 1].fs.push(f); }
  const order = [];
  for (const { fs: gf } of groups.reverse()) { const n = gf.length; let st = Math.max(1, Math.round(n * 0.618)); while (gcd(st, n) !== 1) st++; for (let i = 0; i < n; i++) order.push(gf[(i * st) % n]); }
  scr = await hashAll(order, "scrambled");
  seq2 = await hashAll(frames, "in order again");
} finally {
  await browser.close();
}
const lost = frames.filter((f) => [seq, scr, seq2].some((m) => m.get(f) === "CONTEXT-LOST"));
if (lost.length) console.log(`WARNING: WebGL context lost on ${lost.length} frames — results unreliable (GPU busy?)`);
// unstable: two in-order draws in the same page disagree. order-dependent: stable in order, but differs when scrambled.
const unstable = frames.filter((f) => seq.get(f) !== seq2.get(f));
const bad = frames.filter((f) => seq.get(f) === seq2.get(f) && seq.get(f) !== scr.get(f));
const byShot = {};
const report = (label, list) => {
  const by = {};
  for (const f of list) (by[shotOf(f / FPS)] ||= []).push(f);
  console.log(`\n${label}: ${list.length} of ${frames.length}`);
  for (const [id, fs_] of Object.entries(by)) {
    const runs = []; let s = fs_[0], p = fs_[0];
    for (const f of fs_.slice(1)) { if (f !== p + 1) { runs.push([s, p]); s = f; } p = f; }
    runs.push([s, p]);
    console.log(`  ${id}: ${fs_.length} frames  ` + runs.map(([a, b]) => a === b ? `${(a / FPS).toFixed(2)}` : `${(a / FPS).toFixed(2)}–${(b / FPS).toFixed(2)}`).join(", "));
  }
  return by;
};
report("unstable frames (two in-order draws differ)", unstable);
Object.assign(byShot, report("order-dependent frames", bad));
let changed = [];
if (baseIn) {
  const base = JSON.parse(fs.readFileSync(baseIn, "utf8")).seq || {};
  changed = frames.filter((f) => base[f] !== undefined && base[f] !== seq.get(f));
  const cs = {};
  for (const f of changed) (cs[shotOf(f / FPS)] ||= []).push(f);
  console.log(`in-order frames changed vs baseline: ${changed.length}` + Object.entries(cs).map(([id, v]) => `  ${id}: ${v.length}`).join(""));
}
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ frames: frames.length, bad, unstable, lost, byShot, changed,
  seq: Object.fromEntries(seq), scr: Object.fromEntries(scr), seq2: Object.fromEntries(seq2) }));
console.log(bad.length || unstable.length || lost.length ? "PURITY: FAIL" : "PURITY: PASS");
if (baseIn) console.log(changed.length ? "BASELINE: CHANGED" : "BASELINE: UNCHANGED");
process.exit(bad.length || unstable.length || lost.length || changed.length ? 1 : 0);
