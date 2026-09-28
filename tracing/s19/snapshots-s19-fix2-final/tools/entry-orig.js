// LOSTLOG: report which GL canvas loses its context
const _gc = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (type, o) {
  const c = _gc.call(this, type, o);
  if (c && /webgl/.test(type) && !this.__hooked) { this.__hooked = 1; const id = type + ' ' + this.width + 'x' + this.height + ' ' + new Error().stack.split('\n')[2]; this.addEventListener('webglcontextlost', () => { window.__lostN = (window.__lostN || 0) + 1; console.warn('LOST ' + id); }); }
  return c;
};
// s19 rebuild scratch harness entry (not part of the film)
import { shot } from "./target-orig.js";
import { createPost } from "./src/lib/post.js";
import * as DEV from "./dev.js";
import { setOwlAdjust } from "./src/shots/s19/draw/owl.js";
const W = 2206, H = 946;
const paint = document.createElement("canvas"); paint.width = W; paint.height = H;
const ctx = paint.getContext("2d");
let out = document.getElementById("out");
let grade = null;
function G() { if (!grade || out.getContext("webgl").isContextLost()) { const c = document.createElement("canvas"); c.width = W; c.height = H; out = c; grade = createPost(out); } return grade; }
function clear() { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.filter = "none"; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); }
window.S19 = {
  render(t, graded = true) {
    clear(); ctx.save(); shot.draw(ctx, t - 57.32, t, shot); ctx.restore();
    if (!graded) return paint;
    G()(paint, t, { fade: 1, ...(shot.grade ? shot.grade(t - 57.32, t) : {}) });
    return out;
  },
  timeit2(ts) { const r = []; for (const t of ts) { const a = performance.now(); clear(); shot.draw(ctx, t - 57.32, t, shot); ctx.getImageData(0, 0, 1, 1); r.push(performance.now() - a); } return r; },
  timeit(ts) { const r = []; for (const t of ts) { const a = performance.now(); clear(); shot.draw(ctx, t - 57.32, t, shot); r.push(performance.now() - a); } return r; },
  dev(name, arg, graded = false) { clear(); ctx.save(); DEV[name](ctx, arg); ctx.restore(); if (!graded) return paint; G()(paint, arg && arg.t || 60, { fade: 1 }); return out; },
  devc(name, arg) { return DEV[name](arg); },
  setAdj(a) { setOwlAdjust(a); },
  setSrc(arr, w, h) { this._src = { a: Float32Array.from(arr), w, h }; },
  score(t, adj, box, graded = false) {
    setOwlAdjust(adj);
    const c = this.render(t, graded);
    const { w, h, a } = this._src;
    if (!this._small) { this._small = document.createElement("canvas"); }
    const sm = this._small; sm.width = w; sm.height = h;
    const g = sm.getContext("2d", { willReadFrequently: true }); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    g.drawImage(c, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    let s = 0, n = 0;
    for (let y = box[1]; y < box[3]; y++) for (let x = box[0]; x < box[2]; x++) { const i = y * w + x; s += Math.abs(d[i * 4] / 255 - a[i]); n++; }
    return s / n * 255;
  },
  setMask(arr, w, h) { this._mask = { a: Uint8Array.from(arr), w, h }; },
  iou(t, adj) {
    setOwlAdjust(adj);
    const o = DEV.owlc({ t, tone: false });
    const { a, w, h } = this._mask;
    if (!this._sm2) this._sm2 = document.createElement("canvas");
    const sm = this._sm2; sm.width = w; sm.height = h;
    const g = sm.getContext("2d", { willReadFrequently: true }); g.clearRect(0, 0, w, h); g.drawImage(o, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    let I = 0, U = 0;
    for (let i = 0; i < w * h; i++) { const r = d[i * 4 + 3] > 100 ? 1 : 0, s = a[i]; I += r & s; U += r | s; }
    return I / Math.max(1, U);
  },
  release() { shot.release && shot.release(); },
};
window.S19ready = (async () => {
  await Promise.all(["500 20px 'Geist Mono'", "400 20px 'Geist Mono'", "700 20px 'Geist Mono'", "400 20px Geist", "600 20px Geist"].map((f) => document.fonts.load(f)));
  await document.fonts.ready; return true;
})();
