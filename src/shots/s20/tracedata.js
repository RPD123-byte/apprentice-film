// Decode the traced layers in s20/data/*.js (delta-coded strings, see s20/trace/trace_all.py) and paint them.
import { drawLevels, drawStrokesBinned } from "./tracedraw.js";

// a data string is either CSV integers or (packed) base64 of zigzag LEB128 varints
function nums(s) {
  if (s.includes(",")) return s.split(",").map(Number);
  const b = atob(s), out = [];
  let z = 0, sh = 0;
  for (let i = 0; i < b.length; i++) {
    const c = b.charCodeAt(i);
    z += (c & 0x7f) * 2 ** sh; sh += 7;
    if (!(c & 0x80)) { out.push(z % 2 ? -(z + 1) / 2 : z / 2); z = 0; sh = 0; }
  }
  return out;
}
export function decode(D) {
  const levels = D.levels.map((L) => ({
    v: L.v,
    rings: L.r.map((s) => {
      const d = nums(s), out = new Float32Array(d.length);
      let x = 0, y = 0;
      for (let i = 0; i < d.length; i += 2) { x += d[i]; y += d[i + 1]; out[i] = x / 2; out[i + 1] = y / 2; }
      return out;
    }),
  }));
  const strokes = (arr) => arr.map((s) => {
    const d = nums(s), out = new Float32Array(d.length);
    let X = 0, Y = 0;
    for (let i = 0; i < d.length; i += 5) {
      X += d[i]; Y += d[i + 1];
      out[i] = X / 2; out[i + 1] = Y / 2; out[i + 2] = d[i + 2] / 10; out[i + 3] = d[i + 3] / 100; out[i + 4] = d[i + 4] / 100;
    }
    return out;
  });
  return { levels, dark: strokes(D.dark), bright: strokes(D.bright), mask: D.mask || null };
}

// paint a decoded trace into g (frame coords; g already transformed as needed)
// stroke width gains calibrated on the room trace (raw render vs composite: tone bias ≈ 0 in every value band, finest-scale error lowest)
export const TRACE_OPTS = { binned: true, dk: { wMul: 0.83, wMin: 0.6 }, br: { wMul: 0.62, wMin: 0.6 } };
export function paintTrace(g, T, o = TRACE_OPTS) {
  drawLevels(g, T.levels, o);
  if (o.order === "bd") {
    drawStrokesBinned(g, T.bright, { ...o, ...(o.br || {}) });
    drawStrokesBinned(g, T.dark, { ...o, ...(o.dk || {}) });
  } else {
    drawStrokesBinned(g, T.dark, { ...o, ...(o.dk || {}) });
    drawStrokesBinned(g, T.bright, { ...o, ...(o.br || {}) });
  }
}

// the ground under the lowest value band: the traced rooms' darkest areas average ≈ 0.01 (pre-grade)
export const BG = "rgb(1,1,1)";
// a canvas of w x h whose pixel (0,0) is frame point (x0, y0), black (or transparent) background
export function traceCanvas(T, x0, y0, w, h, { clear = false, clip = null, bg = BG } = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  if (!clear) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  g.translate(-x0, -y0);
  // a clipped layer is opaque inside its clip (its own near-black ground under the value bands)
  if (clip) { g.save(); g.beginPath(); clip(g); g.clip("evenodd"); g.fillStyle = bg; g.fillRect(x0, y0, w, h); }
  paintTrace(g, T);
  if (clip) g.restore();
  return c;
}

export function ringsPath(g, rings) {
  for (const r of rings) { g.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) g.lineTo(r[i], r[i + 1]); g.closePath(); }
}
