// Record every Lay.fill polygon of the s14 room (R40 coords) -> fills.json
const noop = () => {};
function fakeCtx() {
  const t = {};
  return new Proxy(t, {
    get(o, k) {
      if (k in o) return o[k];
      if (k === "createLinearGradient" || k === "createRadialGradient" || k === "createPattern") return () => ({ addColorStop: noop });
      if (k === "getImageData") return (x, y, w, h) => ({ data: new Uint8ClampedArray(4) });
      if (k === "measureText") return () => ({ width: 0 });
      if (k === "getTransform") return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      if (typeof k === "string" && /^[a-z]/.test(k)) return noop;
      return undefined;
    },
    set(o, k, v) { o[k] = v; return true; },
  });
}
globalThis.document = { createElement: () => ({ width: 1, height: 1, getContext: () => fakeCtx() }) };
class Rec {
  constructor() { this.subs = []; this.cur = null; }
  moveTo(x, y) { this.cur = [[x, y]]; this.subs.push(this.cur); }
  lineTo(x, y) { if (!this.cur) this.moveTo(x, y); else this.cur.push([x, y]); }
  closePath() {}
  bezierCurveTo(a, b, c, d, x, y) { const p = this.cur[this.cur.length - 1]; for (let i = 1; i <= 8; i++) { const t = i / 8, u = 1 - t; this.cur.push([u * u * u * p[0] + 3 * u * u * t * a + 3 * u * t * t * c + t * t * t * x, u * u * u * p[1] + 3 * u * u * t * b + 3 * u * t * t * d + t * t * t * y]); } }
  quadraticCurveTo(a, b, x, y) { const p = this.cur[this.cur.length - 1]; for (let i = 1; i <= 6; i++) { const t = i / 6, u = 1 - t; this.cur.push([u * u * p[0] + 2 * u * t * a + t * t * x, u * u * p[1] + 2 * u * t * b + t * t * y]); } }
  ellipse(x, y, rx, ry, rot = 0, a0 = 0, a1 = 7) { const s = []; const n = 28; const span = Math.min(a1 - a0, 2 * Math.PI); for (let i = 0; i <= n; i++) { const a = a0 + (span * i) / n; const cx = Math.cos(a) * rx, cy = Math.sin(a) * ry; s.push([x + cx * Math.cos(rot) - cy * Math.sin(rot), y + cx * Math.sin(rot) + cy * Math.cos(rot)]); } this.subs.push(s); this.cur = s; }
  arc(x, y, r, a0, a1) { this.ellipse(x, y, r, r, 0, a0, a1); }
  rect(x, y, w, h) { const s = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; this.subs.push(s); this.cur = s; }
  roundRect(x, y, w, h) { this.rect(x, y, w, h); }
  arcTo(x1, y1, x2, y2) { this.lineTo(x1, y1); }
}
const out = [];
globalThis.__s14rec = (layer, idx, path, value) => {
  const r = new Rec(); try { path(new Proxy(r, { get: (o, k) => (k in o ? o[k].bind ? o[k].bind(o) : o[k] : noop) })); } catch (e) { }
  out.push({ layer, idx, subs: r.subs.filter((s) => s.length > 2), num: typeof value === "number" ? value : null });
};
const room = await import("/Users/computer/rootline/apprentice-film/src/shots/s14/room.js");
const VEC={}; for (const D of room.LAYERS) { const L = new room.Lay(D.rect, D.sc, D.name); D.paint(L); VEC[D.name]=L.vec; }
const fs = await import("fs");
fs.writeFileSync(process.argv[3], JSON.stringify(VEC)); fs.writeFileSync(process.argv[2], JSON.stringify({ layers: room.LAYERS.map((D) => ({ name: D.name, rect: D.rect, plane: D.plane })), fills: out }));
console.log("fills", out.length);

