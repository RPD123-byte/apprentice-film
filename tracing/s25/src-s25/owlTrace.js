// s25 — a traced held drawing of the owl, redrawn in code (frame px).
// Data (s25/tr_*.js) are control points measured on one source frame per pose, no pixels:
//   mask   : outline rings of the whole figure (plumage, headphones with the black cap under the band, ...)
//   base   : value (pre-grade, 0 black … 1 white) of the darkest band
//   levels : iso-contours of the de-inked value image, lightest last; each band is filled with its measured value
//   strokes: centre-lines of the thin dark ink lines with a width and a core value per point
// Encoding: integer streams as base64 VLQ (zigzag, 5 data bits per char, like source maps). A ring is
// "x0 y0 dx1 dy1 …" in half pixels (deltas from the previous point); rings of one level are joined by spaces. A stroke is
// [n, xy ring (n points), n widths ×10, n values ×100].
// Paint order: tone (base → levels) softened by a small blur, then the ink strokes, all clipped to the outline.
import { taper } from "../../lib/ink.js";
import { gv } from "../../lib/owlInk.js";

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const B64I = new Int16Array(128).fill(-1); for (let i = 0; i < 64; i++) B64I[B64.charCodeAt(i)] = i;
export function vlq(s) {
  const out = []; let z = 0, sh = 0;
  for (let i = 0; i < s.length; i++) {
    const d = B64I[s.charCodeAt(i)];
    z += (d & 31) * 2 ** sh;
    if (d & 32) { sh += 5; continue; }
    out.push(z % 2 ? -(z + 1) / 2 : z / 2); z = 0; sh = 0;
  }
  return out;
}
function ringXY(a, i0, n) {
  const out = new Float32Array(2 * n); let x = 0, y = 0;
  for (let i = 0; i < n; i++) { x += a[i0 + 2 * i]; y += a[i0 + 2 * i + 1]; out[2 * i] = x / 2; out[2 * i + 1] = y / 2; }
  return out;
}
export function decXY(s) { const a = vlq(s); return ringXY(a, 0, a.length / 2); }
function ringPath(c, r, dx = 0, dy = 0) {
  c.moveTo(r[0] - dx, r[1] - dy);
  for (let i = 2; i < r.length; i += 2) c.lineTo(r[i] - dx, r[i + 1] - dy);
  c.closePath();
}
// decode once per trace object (cached on it)
export function decode(T) {
  if (T._d) return T._d;
  const mask = T.mask.map(decXY);
  const levels = T.levels.map((L) => ({ v: L.v, p: L.p ? L.p.split(" ").map(decXY) : [] }));
  const strokes = T.strokes ? T.strokes.split(" ").map((s) => {
    const a = vlq(s), n = a[0], p = ringXY(a, 1, n);
    const ws = a.slice(1 + 2 * n, 1 + 3 * n).map((k) => k / 10), vs = a.slice(1 + 3 * n, 1 + 4 * n).map((k) => k / 100);
    const pts = []; for (let i = 0; i < n; i++) pts.push([p[2 * i], p[2 * i + 1]]);
    return { pts, ws, vs };
  }) : [];
  T._d = { mask, levels, strokes };
  return T._d;
}

// Paint the traced figure into a canvas of the box size (+ pad); returns { canvas, x, y } (frame offset).
// o: { tblur (px, tone softening), soft (px, final softening), strokeW (width gain), strokeV (value offset),
//      tone: (v) => v (value remap), skipStrokes }
export function traceLayer(T, o = {}) {
  const D = decode(T);
  const pad = 6, [bx0, by0, bx1, by1] = T.box;
  const x0 = bx0 - pad, y0 = by0 - pad, w = bx1 - bx0 + 2 * pad, h = by1 - by0 + 2 * pad;
  const mk = () => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const tone = o.tone || ((v) => v);
  // 1) tone
  const tc = mk(), tg = tc.getContext("2d");
  tg.fillStyle = gv(tone(T.base)); tg.fillRect(0, 0, w, h);
  for (const L of D.levels) {
    if (!L.p.length) continue;
    tg.fillStyle = gv(tone(L.v));
    tg.beginPath(); for (const r of L.p) ringPath(tg, r, x0, y0); tg.fill("nonzero");
  }
  // 2) compose: blurred tone, strokes, clipped to the outline
  const out = mk(), g = out.getContext("2d");
  g.save();
  g.beginPath(); for (const r of D.mask) ringPath(g, r, x0, y0); g.clip("nonzero");
  const tb = o.tblur ?? 0.45;
  if (tb > 0) g.filter = `blur(${tb}px)`;
  g.drawImage(tc, 0, 0);
  g.filter = "none";
  if (!o.skipStrokes) {
    const kw = o.strokeW ?? 1, dv = o.strokeV ?? 0;
    g.translate(-x0, -y0);
    for (const s of D.strokes) {
      const n = s.pts.length; if (n < 2) continue;
      let vm = 0; for (const v of s.vs) vm += v; vm /= n;
      const ws = s.ws;
      taper(g, s.pts, (u) => {
        const f = u * (n - 1), i = Math.min(n - 2, Math.floor(f)), k = f - i;
        const ww = ws[i] * (1 - k) + ws[i + 1] * k;
        return ww * kw * (0.35 + 0.65 * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u))), 0.3));
      }, gv(tone(Math.max(0, Math.min(1, vm + dv)))));
    }
  }
  g.restore();
  if (o.soft > 0) {
    const c2 = mk(), g2 = c2.getContext("2d");
    g2.filter = `blur(${o.soft}px)`; g2.drawImage(out, 0, 0); g2.filter = "none";
    return { canvas: c2, x: x0, y: y0 };
  }
  return { canvas: out, x: x0, y: y0 };
}
