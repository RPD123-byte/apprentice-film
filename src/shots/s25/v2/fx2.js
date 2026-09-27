// s25 v2 — effects, drawn by code from measured parameters (frame px):
//   puffs   : smoke / landing dust as soft gaussian blobs [x, y, sx, sy, a]* per frame (fitted to the brightness the
//             smoke adds on the source), drawn additively at quarter resolution and broken up by a seeded wisp texture
//   shadow  : the dark pool round the owl's feet on the page
//   sparkle : the eight-point glint on the big blade (reach measured per frame)
//   band    : the white band that wipes in at 100.48 (edge y = Y0 − 0.4275·x, +476 px per frame, 122 px thick)
//   negLut  : the tone curve of the one negative frame (100.56)
//   slashes : white slash arcs = ellipse arcs [cx, cy, a, b, rot, t0, t1, width, value]* per frame
//   chips   : paper chips = small rotated rects [cx, cy, w, h, angle, value]* per frame
import { rng } from "../../../lib/rng.js";
import { gray } from "./draw.js";

const W = 2206, H = 946, Q = 4;
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
let TEX = null, TEXMEAN = 0, PUFF = null;
function wispTexture() {
  if (TEX) return TEX;
  const w = Math.ceil(W / Q), h = Math.ceil(H / Q), c = mk(w, h), g = c.getContext("2d"), r = rng(2577);
  g.fillStyle = "#b0b0b0"; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 420; i++) {
    const x = r() * w, y = r() * h, rad = 4 + r() * 22, a = 0.05 + r() * 0.12;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad);
  }
  g.globalCompositeOperation = "source-over";
  g.filter = "blur(2px)"; g.drawImage(c, 0, 0); g.filter = "none";
  const d = g.getImageData(0, 0, w, h).data; let s = 0;
  for (let i = 0; i < d.length; i += 4) s += d[i];
  TEXMEAN = s / (d.length / 4) / 255;
  TEX = c;
  return c;
}
// add the puffs of one frame to g (frame px); u = seconds since the puffs began (the wisps drift)
export function drawPuffs(g, blobs, u = 0, gain = 1) {
  if (!blobs || !blobs.length) return;
  const w = Math.ceil(W / Q), h = Math.ceil(H / Q);
  if (!PUFF) PUFF = mk(w, h);
  const sg = PUFF.getContext("2d");
  sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = "source-over"; sg.fillStyle = "#000"; sg.fillRect(0, 0, w, h);
  sg.globalCompositeOperation = "lighter";
  for (let i = 0; i + 4 < blobs.length; i += 5) {
    const x = blobs[i], y = blobs[i + 1], sx = blobs[i + 2], sy = blobs[i + 3], a = blobs[i + 4];
    sg.save(); sg.translate(x / Q, y / Q); sg.scale(sx / Q, sy / Q);
    const gr = sg.createRadialGradient(0, 0, 0, 0, 0, 3);
    for (let k = 0; k <= 12; k++) { const r = k / 4; gr.addColorStop(k / 12, `rgba(255,255,255,${Math.min(1, a * Math.exp(-0.5 * r * r))})`); }
    sg.fillStyle = gr; sg.fillRect(-3, -3, 6, 6);
    sg.restore();
  }
  sg.globalCompositeOperation = "multiply";
  const T = wispTexture();
  sg.drawImage(T, -u * 14, -u * 5, w * (1 + u * 0.03), h * (1 + u * 0.03));
  sg.globalCompositeOperation = "source-over";
  const k = gain / TEXMEAN;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "lighter"; g.imageSmoothingQuality = "medium";
  let left = k;
  while (left > 0.001) { g.globalAlpha = Math.min(1, left); g.drawImage(PUFF, 0, 0, w * Q, h * Q); left -= 1; }
  g.restore();
}

// the chaos smoke: grey (value V) laid OVER the page with the alpha of the puffs (1 − Π(1 − αᵢ)), broken up by the
// wisp texture (its alpha mean is compensated in the puff alphas)
let SMK = null, TEXA = null, TEXAMEAN = 0;
function wispAlpha() {
  if (TEXA) return TEXA;
  const T = wispTexture(), c = mk(T.width, T.height), g = c.getContext("2d");
  const id = T.getContext("2d").getImageData(0, 0, T.width, T.height), d = id.data;
  let mx = 0; for (let i = 0; i < d.length; i += 4) mx = Math.max(mx, d[i]);
  let s = 0;
  for (let i = 0; i < d.length; i += 4) { const a = d[i] / mx; s += a; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.round(a * 255); }
  TEXAMEAN = s / (d.length / 4);
  g.putImageData(id, 0, 0);
  TEXA = c;
  return c;
}
// puffs = [x, y, sx, sy, a, θ]*: rotated gaussians, their alphas SUMMED (the fit's model), clamped at 1
export function smokeLayer(blobs, u = 0, V = 0.93, gain = 1) {
  if (!blobs || !blobs.length) return null;
  const w = Math.ceil(W / Q), h = Math.ceil(H / Q);
  if (!SMK) SMK = mk(w, h);
  const T = wispAlpha();
  const sg = SMK.getContext("2d");
  sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = "source-over"; sg.clearRect(0, 0, w, h);
  sg.globalCompositeOperation = "lighter";
  const c = Math.round(255 * V);
  for (let i = 0; i + 5 < blobs.length; i += 6) {
    const x = blobs[i], y = blobs[i + 1], sx = blobs[i + 2], sy = blobs[i + 3], a = Math.min(1, (gain * blobs[i + 4]) / TEXAMEAN), th = blobs[i + 5];
    sg.save(); sg.translate(x / Q, y / Q); sg.rotate(th); sg.scale(sx / Q, sy / Q);
    const gr = sg.createRadialGradient(0, 0, 0, 0, 0, 3);
    for (let k = 0; k <= 12; k++) { const r = k / 4; gr.addColorStop(k / 12, `rgba(${c},${c},${c},${Math.min(1, a * Math.exp(-0.5 * r * r))})`); }
    sg.fillStyle = gr; sg.fillRect(-3, -3, 6, 6);
    sg.restore();
  }
  sg.globalCompositeOperation = "destination-in";
  sg.drawImage(T, -u * 14, -u * 5, w * (1 + u * 0.03), h * (1 + u * 0.03));
  sg.globalCompositeOperation = "source-over";
  return SMK;
}
export function drawSmokeLayer(g, L, mode = "source-over") {
  if (!L) return;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingQuality = "medium"; g.globalCompositeOperation = mode;
  g.drawImage(L, 0, 0, L.width * Q, L.height * Q);
  g.restore();
}

// the dark pool round the feet (page px): centre, radii and depth measured on the standing frames
export function shadow(g, cx = 1085, cy = 850, r = 330, a = 0.85) {
  const gr = g.createRadialGradient(cx, cy, 10, cx, cy, r);
  gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(0.55, `rgba(0,0,0,${a * 0.7})`); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.save(); g.translate(cx, cy); g.scale(1, 0.4); g.translate(-cx, -cy);
  g.fillStyle = gr; g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  g.restore();
}

// eight-point glint: long spikes up/left/right/down (down 1.45x), short diagonals, a bright core and a soft halo.
// Measured at 106.00 (R = 80): reach up 85, down 115, left 78, right 85, diagonals ~42 px; the spikes stay near-white
// and 3–5 px wide for most of their length; the core is ~16 px across.
export function sparkle(g, x, y, R) {
  g.save(); g.translate(x, y);
  const spike = (ang, len, w) => {
    g.save(); g.rotate(ang);
    g.beginPath(); g.moveTo(0, -w); g.quadraticCurveTo(len * 0.35, -w * 0.55, len, 0); g.quadraticCurveTo(len * 0.35, w * 0.55, 0, w); g.closePath(); g.fill();
    g.restore();
  };
  const sc = Math.min(1, R / 80);
  // halo
  const hr = R * 0.55;
  const hg = g.createRadialGradient(0, 0, 0, 0, 0, hr);
  hg.addColorStop(0, "rgba(250,250,247,0.35)"); hg.addColorStop(0.35, "rgba(245,245,242,0.1)"); hg.addColorStop(1, "rgba(245,245,242,0)");
  g.fillStyle = hg; g.beginPath(); g.arc(0, 0, hr, 0, Math.PI * 2); g.fill();
  // soft wide spikes under the crisp ones
  g.fillStyle = "rgba(248,248,245,0.18)";
  for (const [a, k] of [[-Math.PI / 2, 1.06], [Math.PI, 0.97], [0, 1.06], [Math.PI / 2, 1.45]]) spike(a, R * k * 0.7, 9 * sc + 2);
  g.fillStyle = "rgba(252,252,249,0.98)";
  for (const [a, k] of [[-Math.PI / 2, 1.06], [Math.PI, 0.97], [0, 1.06], [Math.PI / 2, 1.45]]) spike(a, R * k, 5.5 * sc + 1);
  for (let i = 0; i < 4; i++) spike(Math.PI / 4 + i * Math.PI / 2, R * 0.52, 4.5 * sc + 0.8);
  const cr = 8 + 12 * sc;
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, cr);
  gr.addColorStop(0, "rgba(255,255,253,1)"); gr.addColorStop(0.6, "rgba(253,253,250,0.95)"); gr.addColorStop(1, "rgba(250,250,247,0)");
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, cr, 0, Math.PI * 2); g.fill();
  g.restore();
}

// the opening wipe band
export const bandY0 = (t) => 884 + (t - 100.48) * 25 * 476;
export const BAND_SLOPE = -0.4275, BAND_W = 122;
export function bandPath(g, y0, y1) { g.moveTo(-10, y0 + BAND_SLOPE * -10); g.lineTo(W + 10, y0 + BAND_SLOPE * (W + 10)); g.lineTo(W + 10, y1 + BAND_SLOPE * (W + 10)); g.lineTo(-10, y1 + BAND_SLOPE * -10); g.closePath(); }

// the negative frame's tone curve: [positive luminosity, output]
const NEG = [[0, 244], [36, 245], [52, 254], [84, 250], [100, 240], [108, 211], [116, 183], [124, 137], [140, 113], [148, 109], [156, 68], [172, 50], [188, 31], [212, 18], [236, 7], [255, 5]];
let NEGLUT = null;
export function negLut() {
  if (NEGLUT) return NEGLUT;
  NEGLUT = new Uint8ClampedArray(256);
  for (let v = 0, k = 0; v < 256; v++) { while (k < NEG.length - 2 && NEG[k + 1][0] < v) k++; const [a, A] = NEG[k], [b, B] = NEG[k + 1]; NEGLUT[v] = A + (B - A) * Math.min(1, Math.max(0, (v - a) / (b - a))); }
  return NEGLUT;
}

// slash arcs: tapered white strokes along ellipse arcs; rows = [[cx, cy, a, b, rot, t0, t1, width, value], …]
export function drawSlashes(g, rows, fill = 0) {
  if (!rows) return;
  if (fill > 0) {
    // bridge the gaps (< fill rad) between the measured visible intervals of the same ellipse (the detection breaks
    // where cracks or owls cross the arc; the source draws it unbroken)
    const groups = new Map();
    for (const r of rows) { const k = r.slice(0, 5).join(","); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
    const out = [];
    for (const rs of groups.values()) {
      rs.sort((a, b) => a[5] - b[5]);
      let cur = rs[0].slice();
      for (let i = 1; i < rs.length; i++) {
        if (rs[i][5] - cur[6] < fill) { cur[6] = Math.max(cur[6], rs[i][6]); cur[7] = Math.max(cur[7], rs[i][7]); }
        else { out.push(cur); cur = rs[i].slice(); }
      }
      out.push(cur);
    }
    rows = out;
  }
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  for (const [cx, cy, a, b, rot, t0, t1, w, v] of rows) {
    const n = Math.max(12, Math.ceil((t1 - t0) * 60)), pts = [], c = Math.cos(rot), s = Math.sin(rot);
    for (let i = 0; i <= n; i++) { const t = t0 + ((t1 - t0) * i) / n, u = Math.cos(t) * a, q = Math.sin(t) * b; pts.push([cx + u * c - q * s, cy + u * s + q * c]); }
    const col = Math.round(Math.min(1, v + 0.02) * 255);
    for (const [kw, al] of [[1.9, 0.16], [1.0, 0.95]]) {
      g.strokeStyle = `rgb(${col},${col},${col - 2})`;
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n, tp = Math.min(1, u / 0.08, (1 - u) / 0.08);
        g.globalAlpha = al * Math.min(1, 0.35 + 0.65 * tp); g.lineWidth = w * kw * (0.45 + 0.55 * tp);
        g.beginPath(); g.moveTo(pts[i][0], pts[i][1]); g.lineTo(pts[i + 1][0], pts[i + 1][1]); g.stroke();
      }
    }
  }
  g.restore();
}

// paper chips: pale rects with a thin dark edge
export function drawChips(g, row) {
  if (!row) return;
  g.save();
  for (let i = 0; i + 5 < row.length; i += 6) {
    const [x, y, w, h, ang, v] = row.slice(i, i + 6);
    g.save(); g.translate(x, y); g.rotate(ang);
    g.fillStyle = gray(Math.min(1, v + 0.03)); g.fillRect(-w / 2, -h / 2, w, h);
    g.lineWidth = 1.8; g.strokeStyle = gray(0.1, 0.9); g.strokeRect(-w / 2 - 0.9, -h / 2 - 0.9, w + 1.8, h + 1.8);
    g.restore();
  }
  g.restore();
}

export function releaseFx() { TEX = null; PUFF = null; TEXMEAN = 0; SMK = null; TEXA = null; TEXAMEAN = 0; }

// ---------------------------------------------------------------- the converging echo owls (102.38–102.74)
// Keyed on the source (blob centroids of the soft echo owls, per frame): [t, x, y, s, rot]; flip = mirrored owl
export const ECHOES = [
  { t0: 102.38, t1: 102.74, flip: 0, a: 0.55, keys: [[102.38, 540, 225, 0.46, 0.2], [102.56, 457, 240, 0.46, 0.2], [102.6, 430, 236, 0.46, 0.25], [102.64, 566, 309, 0.5, 0.3], [102.68, 784, 345, 0.52, 0.35], [102.72, 918, 447, 0.55, 0.3]] },
  { t0: 102.38, t1: 102.74, flip: 1, a: 0.55, keys: [[102.38, 1900, 205, 0.46, -0.2], [102.56, 1773, 280, 0.46, -0.25], [102.6, 1620, 369, 0.48, -0.3], [102.64, 1454, 433, 0.5, -0.3], [102.72, 1268, 529, 0.52, -0.3]] },
  { t0: 102.42, t1: 102.7, flip: 1, a: 0.5, keys: [[102.42, 1740, 600, 0.44, -0.1], [102.56, 1824, 665, 0.44, -0.1], [102.64, 1647, 633, 0.46, -0.2], [102.7, 1400, 560, 0.5, -0.2]] },
  { t0: 102.42, t1: 102.7, flip: 0, a: 0.5, keys: [[102.42, 98, 793, 0.44, 0.1], [102.5, 107, 736, 0.44, 0.1], [102.6, 492, 726, 0.46, -0.1], [102.66, 657, 641, 0.48, -0.2], [102.7, 800, 580, 0.5, -0.2]] },
];
export function track(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b[0]) { const u = (t - a[0]) / (b[0] - a[0]); return a.slice(1).map((v, k) => v + (b[k + 1] - v) * u); }
  }
  return keys[keys.length - 1].slice(1);
}
