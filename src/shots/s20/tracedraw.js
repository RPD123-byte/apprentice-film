// Redraw of traced ink data (s20/trace/*.py measure the source; the data modules hold control points only):
//   levels  [{ v, rings: [[x0,y0,x1,y1,...], ...] }]  value bands, stacked dark → light, each filled even-odd
//   dark    [[x, y, w, v, b, ...]]                    dark ink centre-lines (width px, ink value, surface value)
//   bright  [[x, y, w, v, b, ...]]                    white ink centre-lines
// Each stroke is drawn in one tone (its extreme value) with the width scaled so the ink mass (width × contrast
// against the surface) matches the measurement: pale ends come out as a natural taper.
import { taper } from "../../lib/ink.js";
import { sampleCurve } from "../../lib/paths.js";

// warm grey: the source room is a touch warm (R − B ≈ +5 in the lit greys)
export const tone = (v) => {
  const u = Math.max(0, Math.min(1, v)) * 255;
  const k = u / 255 * (1 - u / 255) * 4;
  return `rgb(${Math.round(u + 3 * k)},${Math.round(u + 1 * k)},${Math.round(u - 3 * k)})`;
};

export function drawLevels(g, levels, { blur = 0 } = {}) {
  if (blur) g.filter = `blur(${blur}px)`;
  for (const L of levels) {
    if (!L.rings.length) continue;
    g.fillStyle = tone(L.v);
    g.beginPath();
    for (const r of L.rings) {
      g.moveTo(r[0], r[1]);
      for (let i = 2; i < r.length; i += 2) g.lineTo(r[i], r[i + 1]);
      g.closePath();
    }
    g.fill("evenodd");
  }
  if (blur) g.filter = "none";
}

const CAL = { w: 1.0, wMin: 0.45, end: 3 };
export function drawStrokes(g, set, polarity, { gain = 1, wMul = 1, map = null } = {}) {
  for (const s of set) {
    const n = s.length / 5;
    if (n < 2) continue;
    const pts = [], w = [], v = [], b = [];
    for (let i = 0; i < s.length; i += 5) { pts.push(map ? map([s[i], s[i + 1]]) : [s[i], s[i + 1]]); w.push(s[i + 2]); v.push(s[i + 3]); b.push(s[i + 4]); }
    let ve = polarity > 0 ? 0 : 1;
    for (const x of v) ve = polarity > 0 ? Math.max(ve, x) : Math.min(ve, x);
    const wm = w.map((x, i) => {
      const c = Math.abs(v[i] - b[i]), ce = Math.max(0.02, Math.abs(ve - b[i]));
      return x * Math.min(1.2, c / ce);
    });
    const per = n > 2 ? 3 : 1, q = n > 2 ? sampleCurve(pts, per) : pts;
    const S = [0];
    for (let i = 1; i < q.length; i++) S.push(S[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]));
    const L = S[S.length - 1];
    const wAt = (i) => { const f = i / per, a = Math.min(n - 1, Math.floor(f)), bb = Math.min(n - 1, a + 1), t = f - a; return wm[a] + (wm[bb] - wm[a]) * t; };
    const col = tone(polarity > 0 ? Math.min(1, ve * gain) : ve);
    taper(g, q, (u) => {
      const i = Math.round(u * (q.length - 1)), s0 = S[i];
      const e = Math.min(1, s0 / CAL.end, (L - s0) / CAL.end);
      return Math.max(CAL.wMin, wAt(i) * CAL.w * wMul) * (0.45 + 0.55 * Math.sqrt(Math.max(0, e)));
    }, col);
  }
}

// Segment-binned strokes: every stroke is resampled (Catmull-Rom) and each short piece is drawn with its own measured
// width and value; pieces are batched by (value, width) bin so a whole layer is a few hundred stroke() calls.
export function drawStrokesBinned(g, set, { vBins = 40, wStep = 0.35, wMul = 1, wMin = 0.6, vGain = 1, vOff = 0, map = null, cap = "round" } = {}) {
  const bins = new Map();
  for (const s of set) {
    const n = s.length / 5;
    if (n < 2) continue;
    const pts = [], w = [], v = [];
    for (let i = 0; i < s.length; i += 5) { pts.push(map ? map([s[i], s[i + 1]]) : [s[i], s[i + 1]]); w.push(s[i + 2]); v.push(s[i + 3]); }
    const per = 3, q = n > 2 ? sampleCurve(pts, per) : [pts[0], [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2], pts[1]];
    const pp = n > 2 ? per : 2, m = q.length;
    for (let k = 0; k < m - 1; k++) {
      const f = (k + 0.5) / pp, a = Math.min(n - 1, Math.floor(f)), b = Math.min(n - 1, a + 1), t = f - a;
      let ww = (w[a] + (w[b] - w[a]) * t) * wMul;
      const vv = Math.max(0, Math.min(1, (v[a] + (v[b] - v[a]) * t) * vGain + vOff));
      const e = Math.min(k + 0.5, m - 1.5 - k);
      if (e < 1.5) ww *= 0.55 + 0.3 * e;
      ww = Math.max(wMin, ww);
      const key = Math.round(vv * vBins) * 1000 + Math.round(ww / wStep);
      let arr = bins.get(key); if (!arr) bins.set(key, (arr = []));
      arr.push(q[k][0], q[k][1], q[k + 1][0], q[k + 1][1]);
    }
  }
  g.lineCap = cap; g.lineJoin = "round";
  const keys = [...bins.keys()].sort((a, b) => a - b);
  for (const key of keys) {
    const arr = bins.get(key), vb = Math.floor(key / 1000), wb = key % 1000;
    g.strokeStyle = tone(vb / vBins); g.lineWidth = wb * wStep;
    g.beginPath();
    for (let i = 0; i < arr.length; i += 4) { g.moveTo(arr[i], arr[i + 1]); g.lineTo(arr[i + 2], arr[i + 3]); }
    g.stroke();
  }
}

// the whole trace onto g (already transformed into the trace's coordinate frame)
export function drawTrace(g, T, o = {}) {
  drawLevels(g, T.levels, o);
  if (o.binned) {
    // dark ink: darkest pieces last so crossings keep their black; white ink: brightest last
    drawStrokesBinned(g, T.dark, { ...o, ...(o.dk || {}) });
    drawStrokesBinned(g, T.bright, { ...o, ...(o.br || {}) });
  } else {
    drawStrokes(g, T.dark, -1, o);
    drawStrokes(g, T.bright, +1, o);
  }
}
