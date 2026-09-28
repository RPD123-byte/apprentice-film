// The end card, drawn in code: warm sky, two folded retro ribbons, cloud banks, sparkles, the extruded "rapport"
// wordmark, the tagline and the owl on the full stop. Everything static is baked once into one canvas (with its print
// grain); only the owl is redrawn per frame. Colours are pre-grade values: the global grade (post.js) adds halation,
// the S-curve and the vignette on top, and they were chosen so the graded result matches the source.
import { W, H } from "../../config.js";
import { rng, clamp } from "../../lib/rng.js";
import { GLYPHS } from "./glyphs.js";
import { RIBBONS, CLOUDS_BACK, CLOUDS_FRONT, SPARKLES, TAG_WORDS, TAG_BASELINE } from "./data.js";
import { drawOwl } from "./owl.js";
import { CLOUD_TONE, CLOUD_SHADING } from "./cloudshade.js";

// The card dissolves in linearly over the sleeping room from 135.75 to 136.96 (measured; 0.21 in at the 136.0 cut).
export const CARD_IN = 135.75, CARD_FULL = 136.96;
export const cardAlpha = (t) => clamp((t - CARD_IN) / (CARD_FULL - CARD_IN));

const C = {
  dark: "#63303e", ribCream: "#f4e5cd", ribPeach: "#e88f5b", ribRed: "#d7481e",
  cloudLight: "#f1ddbd", cloudTan: "#d8b98f", cloudLine: "#5e3a44",
  face: "#f6f1e8", key: "#500b1f", ext1: "#d23a1c", ext2: "#a6250f", extDark: "#3a0e2c", stop: "#eb6235",
  tagMaroon: "#4a122b", tagCream: "#f5e8d2", sparkle: "#f3e4c6",
};

// ---------- sky ----------
function sky(g) {
  // one elliptical gradient fitted to the source (centre above the frame), stops in pre-grade colour
  g.save();
  g.setTransform(1536 / 1000, 0, 0, 1713 / 1000, 1173, -872);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1000);
  gr.addColorStop(0, "#f0ca75"); gr.addColorStop(0.5, "#f0ca75"); gr.addColorStop(0.625, "#efa152");
  gr.addColorStop(0.75, "#eb7d3c"); gr.addColorStop(0.875, "#e35d2b"); gr.addColorStop(1, "#ca4423");
  g.fillStyle = gr;
  g.fillRect(-2000, -2000, 6000, 6000);
  g.restore();
  // low in the middle, between the cloud banks, the sky lifts again to a warmer orange (measured along x 900-1400)
  g.save();
  g.setTransform(760 / 1000, 0, 0, 330 / 1000, 1130, 1075);
  const lg = g.createRadialGradient(0, 0, 0, 0, 0, 1000);
  lg.addColorStop(0, "rgba(232,122,52,1)"); lg.addColorStop(0.43, "rgba(229,120,50,1)"); lg.addColorStop(1, "rgba(229,120,50,0)");
  g.fillStyle = lg; g.fillRect(-2000, -2000, 4000, 4000);
  g.restore();
}

// ---------- ribbons ----------
// Catmull-Rom through a list of values (uniform parameter), sampled `per` times per segment.
function crSample(vals, per) {
  const n = vals.length, out = [];
  const V = (i) => vals[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - 1; i++) {
    const p0 = V(i - 1), p1 = V(i), p2 = V(i + 1), p3 = V(i + 2);
    for (let j = 0; j < per; j++) {
      const t = j / per, t2 = t * t, t3 = t2 * t;
      out.push(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3));
    }
  }
  out.push(vals[n - 1]);
  return out;
}
const STRIPE_COLS = () => [C.dark, C.ribRed, C.ribPeach, C.ribCream, C.ribPeach, C.ribRed, C.dark];

// Gaussian-smooth a polyline along its arc length (ends pinned), so the measured cross-sections join up without kinks.
function smoothLine(pts, sigma) {
  const n = pts.length, cum = [0];
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const out = [];
  let lo = 0;
  for (let i = 0; i < n; i++) {
    const w0 = Math.min(1, Math.min(cum[i], cum[n - 1] - cum[i]) / (2 * sigma));
    let sx = 0, sy = 0, sw = 0;
    while (cum[lo] < cum[i] - 3 * sigma) lo++;
    for (let j = lo; j < n && cum[j] <= cum[i] + 3 * sigma; j++) {
      const d = cum[j] - cum[i], w = Math.exp(-0.5 * (d * d) / (sigma * sigma));
      sx += pts[j][0] * w; sy += pts[j][1] * w; sw += w;
    }
    out.push([pts[i][0] + (sx / sw - pts[i][0]) * w0, pts[i][1] + (sy / sw - pts[i][1]) * w0]);
  }
  return out;
}
function band(g, rows) {
  const per = 12;
  const ys = crSample(rows.map((r) => r[0]), per);
  const xs = [];
  for (let k = 1; k <= 8; k++) xs.push(crSample(rows.map((r) => r[k]), per));
  const n = ys.length;
  for (let i = 0; i < n; i++) for (let k = 1; k < 8; k++) if (xs[k][i] < xs[k - 1][i]) xs[k][i] = xs[k - 1][i];
  const cols = STRIPE_COLS();
  const E = [];
  for (let k = 0; k < 8; k++) E.push(smoothLine(ys.map((y, i) => [xs[k][i], y]), 7));
  const edge = (k, rev) => (rev ? E[k].slice().reverse() : E[k]);
  const poly = (a, b) => { g.beginPath(); a.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); b.forEach(([x, y]) => g.lineTo(x, y)); g.closePath(); };
  // stroke boundary k only where the stripes on both sides of it are really there
  const stroke = (k) => {
    g.beginPath();
    let on = false;
    for (let i = 0; i < n; i++) {
      const ok = xs[k][i] - xs[k - 1][i] > 3 && xs[k + 1][i] - xs[k][i] > 3;
      const [x, y] = E[k][i];
      if (ok) { if (on) g.lineTo(x, y); else g.moveTo(x, y); }
      on = ok;
    }
    g.stroke();
  };
  // each stripe covers from its left boundary to the band's right edge, so neighbours never leave a seam
  for (let k = 0; k < 7; k++) {
    poly(edge(k, false), edge(7, true));
    g.fillStyle = cols[k]; g.fill();
  }
  // airbrushed transitions between the light stripes; the red deepens next to the dark edges
  g.save();
  poly(edge(0, false), edge(7, true)); g.clip();
  g.filter = "blur(4px)"; g.lineCap = "round"; g.lineJoin = "round";
  g.globalAlpha = 0.55; g.lineWidth = 9;
  for (const [k, col] of [[2, "#e06a3a"], [5, "#e06a3a"], [3, "#eeb58a"], [4, "#eeb58a"]]) { g.strokeStyle = col; stroke(k); }
  g.globalAlpha = 0.14; g.lineWidth = 10; g.strokeStyle = "#a82c18";
  for (const k of [1, 6]) stroke(k);
  g.restore();
  // crisp dark edges back on top
  poly(edge(0, false), edge(1, true)); g.fillStyle = cols[0]; g.fill();
  poly(edge(6, false), edge(7, true)); g.fillStyle = cols[6]; g.fill();
}

// ---------- clouds ----------
// cloud colour on the measured cream -> tan scale (see cloudshade.js), extrapolated linearly past the end stops
function cloudTone(a) {
  const T = CLOUD_TONE;
  const k = a < T[1][0] ? 0 : 1, [a0, c0] = T[k], [a1, c1] = T[k + 1], u = (a - a0) / (a1 - a0);
  return `rgb(${c0.map((v, j) => Math.round(Math.max(0, Math.min(255, v + (c1[j] - v) * u)))).join(",")})`;
}
function cloudLayer(g, puffs, li) {
  // the fitted circles run down the middle of the source keylines (~5 px), so the cream stops 2.5 px inside them
  const circ = (x, y, r) => { g.beginPath(); g.arc(x, y, r - 2.5, 0, Math.PI * 2); };
  const S = CLOUD_SHADING[li];
  // keyline round the outside of the union: stroke every puff, then fill every puff over it
  g.lineWidth = 10; g.strokeStyle = C.cloudLine;
  for (const [x, y, r] of puffs) { circ(x, y, r); g.stroke(); }
  g.fillStyle = cloudTone(S.cream);
  for (const [x, y, r] of puffs) { circ(x, y, r); g.fill(); }
  // the airbrushed tan shapes inside the layer, soft-edged, deepening across it
  g.save();
  g.beginPath(); for (const [x, y, r] of puffs) { g.moveTo(x + r - 2.5, y); g.arc(x, y, r - 2.5, 0, Math.PI * 2); } g.clip();
  const [c0, c1, c2] = S.tan, gx = c1 / 1103, gy = c2 / 473, gn = Math.hypot(gx, gy);
  let cx = 0, cy = 0; for (const [x, y] of S.tanShapes) { cx += x; cy += y; } cx /= S.tanShapes.length || 1; cy /= S.tanShapes.length || 1;
  const aq = c0 + c1 * (cx - 1103) / 1103 + c2 * (cy - 473) / 473;
  if (gn > 1e-5) {
    const ux = gx / gn, uy = gy / gn, t0 = (0.3 - aq) / gn, t1 = (0.75 - aq) / gn;
    const gr = g.createLinearGradient(cx + ux * t0, cy + uy * t0, cx + ux * t1, cy + uy * t1);
    for (let k = 0; k <= 6; k++) gr.addColorStop(k / 6, cloudTone(0.3 + (0.45 * k) / 6));
    g.fillStyle = gr;
  } else g.fillStyle = cloudTone(Math.max(0.3, Math.min(0.75, aq)));
  g.filter = "blur(3.5px)";
  g.beginPath(); for (const [x, y, r] of S.tanShapes) { g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2); } g.fill();
  g.filter = "none";
  g.restore();
}

// ---------- sparkles ----------
function sparkle(g, x, y, rx, ry) {
  const k = 0.045;
  g.beginPath();
  g.moveTo(x, y - ry);
  g.quadraticCurveTo(x + rx * k, y - ry * k, x + rx, y);
  g.quadraticCurveTo(x + rx * k, y + ry * k, x, y + ry);
  g.quadraticCurveTo(x - rx * k, y + ry * k, x - rx, y);
  g.quadraticCurveTo(x - rx * k, y - ry * k, x, y - ry);
  g.closePath();
  g.fillStyle = C.sparkle; g.fill();
}

// ---------- wordmark ----------
const glyphPaths = () => {
  const out = {};
  for (const [k, contours] of Object.entries(GLYPHS)) {
    const p = new Path2D(), outer = new Path2D(), counters = new Path2D();
    contours.forEach((flat, ci) => {
      const pts = [];
      for (let i = 0; i < flat.length; i += 2) pts.push([flat[i], flat[i + 1]]);
      const n = pts.length;
      const P = (i) => pts[(i + n) % n];
      for (const q of [p, ci ? counters : outer]) {
        q.moveTo(pts[0][0], pts[0][1]);
        for (let i = 0; i < n; i++) {
          const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), s = 1 / 6;
          q.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * s, p1[1] + (p2[1] - p0[1]) * s, p2[0] - (p3[0] - p1[0]) * s, p2[1] - (p3[1] - p1[1]) * s, p2[0], p2[1]);
        }
        q.closePath();
      }
    });
    out[k] = p;
    if (contours.length > 1) { out[k + ":o"] = outer; out[k + ":c"] = counters; }
  }
  const stop = new Path2D(); stop.arc(1574, 453, 51, 0, Math.PI * 2);
  out.stop = stop;
  return out;
};
// the stacked extrusion, fitted to the source outlines (IoU of the dark lines): a light red band to (21,25), a red band
// to (29,43), a dark edge to (46,54) -- the same offsets for every letter
const EXT = [[46, 54, "extDark"], [29, 43, "ext2"], [21, 25, "ext1"]];

function extrudeOne(g, path, faceCol, outer, counters, crescent) {
  for (const [ex, ey, key] of EXT) {
    const steps = Math.ceil(Math.hypot(ex, ey) / 1.5);
    g.lineWidth = 10; g.strokeStyle = C.key; g.lineJoin = "round";
    for (let s = 1; s <= steps; s++) { g.save(); g.translate((ex * s) / steps, (ey * s) / steps); g.stroke(path); g.restore(); }
    g.fillStyle = C[key];
    for (let s = 1; s <= steps; s++) { g.save(); g.translate((ex * s) / steps, (ey * s) / steps); g.fill(path, "evenodd"); g.restore(); }
  }
  g.fillStyle = faceCol; g.fill(path, "evenodd");
  if (counters && crescent) {
    // through the counters (a, p, p, o) the extrusion's inner wall shows as a dark crescent on the lower right: the counter
    // minus itself shifted up-left
    const sh = new Path2D(); sh.rect(0, 0, W, H); sh.addPath(counters, new DOMMatrix([1, 0, 0, 1, -8, -9]));
    g.save(); g.clip(counters); g.clip(sh, "evenodd");
    g.fillStyle = C.extDark; g.fill(counters);
    g.restore();
  }
  g.strokeStyle = C.key;
  if (counters) { g.lineWidth = 5.5; g.stroke(outer); g.lineWidth = 4; g.stroke(counters); }
  else { g.lineWidth = 5.5; g.stroke(path); }
}

function wordmark(g) {
  const P = glyphPaths();
  // soft shadow the extrusion throws on the sky just below it
  g.save();
  g.filter = "blur(18px)"; g.globalAlpha = 0.42; g.fillStyle = "#6e1c10";
  g.translate(26, 58);
  for (const k of ["r", "a", "p", "p2", "o", "r2", "t", "stop"]) g.fill(P[k]);
  g.restore();
  for (const k of ["r", "a", "p", "p2", "o", "r2", "t"]) extrudeOne(g, P[k], C.face, P[k + ":o"], P[k + ":c"], true);
  extrudeOne(g, P.stop, C.stop);
}

// ---------- tagline ----------
function tagline(g) {
  g.save();
  g.textBaseline = "alphabetic";
  // size from the measured cap height (658 -> 697), then each word stretched to its measured ink width
  g.font = "900 100px Satoshi";
  const capH = g.measureText("R").actualBoundingBoxAscent;
  const size = (39.5 / capH) * 100;
  g.font = `900 ${size.toFixed(2)}px Satoshi`;
  for (let i = 0; i < TAG_WORDS.length; i++) {
    const [word, x0, x1] = TAG_WORDS[i];
    const m = g.measureText(word);
    const inkW = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    const sx = (x1 - x0 + 1) / inkW;
    g.save();
    // (fix pass 2: the maroon words sat ~0.8 px high and printed ~12% light against the source)
    g.translate(x0, TAG_BASELINE + (i < 4 ? 0.8 : 0)); g.scale(sx, 1);
    g.fillStyle = g.strokeStyle = i < 4 ? C.tagMaroon : C.tagCream;
    // the source face is a touch heavier than Satoshi Black: thicken the strokes slightly
    g.lineWidth = i < 4 ? 2.4 : 1.0; g.lineJoin = "round";
    g.strokeText(word, m.actualBoundingBoxLeft, 0);
    g.fillText(word, m.actualBoundingBoxLeft, 0);
    g.restore();
  }
  g.restore();
}

// ---------- print grain ----------
// Two octaves of smooth value noise (blotches of ~4 and ~13 px), fine speckle, and the printed halftone: dark dots on a
// ~7.5 px screen at 30 deg, jittered: soft and faint in the shaded parts of the clouds, faint on the ribbons, faint and
// patchy on the sky. Fix pass 2: the static texture was weakened (it measured ~1.5x the source's fine and mid-scale
// variation once post.js's moving grain is added) and highlights print cleaner than mid-tones.
function lattice(w, h, seed) {
  const r = rng(seed), a = new Float32Array(w * h);
  for (let i = 0; i < a.length; i++) a[i] = r() * 2 - 1;
  return a;
}
function grain(g, mask) {
  const img = g.getImageData(0, 0, W, H), d = img.data;
  const md = mask.getContext("2d").getImageData(0, 0, W, H).data;
  const s1 = 3.8, s2 = 13, s3 = 60;
  const dims = (s) => [Math.ceil(W / s) + 3, Math.ceil(H / s) + 3];
  const [w1, h1] = dims(s1), [w2, h2] = dims(s2), [w3, h3] = dims(s3);
  const L1 = lattice(w1, h1, 4011), L2 = lattice(w2, h2, 4012), L3 = lattice(w3, h3, 4014), r = rng(4013);
  const fade = (t) => t * t * (3 - 2 * t);
  const sample = (L, w, x, y) => {
    const ix = x | 0, iy = y | 0, fx = fade(x - ix), fy = fade(y - iy);
    const a = L[iy * w + ix], b = L[iy * w + ix + 1], c = L[(iy + 1) * w + ix], e = L[(iy + 1) * w + ix + 1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + e) * fx * fy;
  };
  const P = 7.5, ca = Math.cos(Math.PI / 6) / P, sa = Math.sin(Math.PI / 6) / P;
  const jit = (i, j, k) => { let h = Math.imul(i * 73856093 ^ j * 19349663 ^ k * 83492791, 0x5bd1e995); h ^= h >>> 15; return ((h >>> 0) / 4294967296 - 0.5) * 0.26; };
  // cloud shade measured against the airbrush colours (cloudshade.js)
  const lightL = 0.299 * 245 + 0.587 * 231 + 0.114 * 207, tanL = 0.299 * 226 + 0.587 * 199 + 0.114 * 166;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const cloud = md[i] / 255, obj = md[i + 1] / 255, rib = md[i + 2] / 255;
      const Lp = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      // the fine blotches are strongest in the mid-tones; highlights (letter faces, cream stripes) print cleaner
      const hiCut = 1 - 0.7 * Math.min(1, Math.max(0, (Lp - 170) / 60));
      let n = 0.055 * hiCut * sample(L1, w1, x / s1 + 1, y / s1 + 1) + 0.02 * hiCut * sample(L2, w2, x / s2 + 1, y / s2 + 1);
      const sp = r();
      if (sp < 0.01) n += 0.05 * hiCut; else if (sp > 0.992) n -= 0.05 * hiCut;
      n += (r() - 0.5) * 0.012;
      // halftone dot coverage at this pixel
      const u = x * ca + y * sa, v = -x * sa + y * ca;
      const iu = Math.round(u), iv = Math.round(v);
      const du = (u - iu - jit(iu, iv, 1)) * P, dv = (v - iv - jit(iu, iv, 2)) * P;
      const dist = Math.sqrt(du * du + dv * dv);
      let dot = 0;
      if (cloud > 0.01) {
        // faint, soft dots, only where the airbrush has shaded the cloud
        const shade = Math.min(1.2, Math.max(0, (lightL - Lp) / (lightL - tanL)));
        const k = Math.min(1, Math.max(0, (shade - 0.3) / 0.55));
        const rd = 1.1 + 1.3 * Math.min(1, shade);
        dot += cloud * 0.075 * k * k * (3 - 2 * k) * Math.min(1, Math.max(0, (rd + 1.3 - dist) / 2.6));
      }
      if (rib > 0.01) dot += rib * 0.05 * Math.min(1, Math.max(0, (1.9 - dist) / 1.8));
      if (obj < 0.99) {
        const patch = Math.max(0, sample(L3, w3, x / s3 + 1, y / s3 + 1) * 0.5 + 0.35);
        const rd = 1.1 * patch;
        dot += (1 - obj) * 0.07 * Math.min(1, Math.max(0, rd + 0.6 - dist));
      }
      const m = (1 + n) * (1 - dot);
      d[i] = d[i] * m; d[i + 1] = d[i + 1] * m; d[i + 2] = d[i + 2] * m;
    }
  }
  g.putImageData(img, 0, 0);
}

// ---------- the static plate ----------
let plate = null;
function bandOutline(g, rows) {
  const per = 12, ys = crSample(rows.map((r) => r[0]), per), x0 = crSample(rows.map((r) => r[1]), per), x7 = crSample(rows.map((r) => r[8]), per);
  g.beginPath();
  for (let i = 0; i < ys.length; i++) (i ? g.lineTo(x0[i], ys[i]) : g.moveTo(x0[i], ys[i]));
  for (let i = ys.length - 1; i >= 0; i--) g.lineTo(x7[i], ys[i]);
  g.closePath(); g.fill();
}
function buildMask() {
  // red = cloud, green = anything that is not sky, blue = ribbon; painted in the plate's own stacking order
  const m = document.createElement("canvas"); m.width = W; m.height = H;
  const g = m.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  const clouds = (layers) => { g.fillStyle = "#ff0"; for (const L of layers) for (const [x, y, r] of L) { g.beginPath(); g.arc(x, y, r + 3, 0, Math.PI * 2); g.fill(); } };
  clouds(CLOUDS_BACK);
  g.fillStyle = "#0ff";
  for (const k of ["leftB", "leftA", "rightB", "rightA"]) bandOutline(g, RIBBONS[k]);
  clouds(CLOUDS_FRONT);
  g.fillStyle = "#0f0";
  const P = glyphPaths();
  for (const k of Object.keys(P)) for (let s = 0; s <= 12; s++) { g.save(); g.translate(s * 3.2, s * 4.7); g.lineWidth = 12; g.strokeStyle = "#0f0"; g.stroke(P[k]); g.fill(P[k]); g.restore(); }
  g.fillRect(540, 650, 1090, 65);
  for (const [x, y, rx, ry] of SPARKLES) g.fillRect(x - rx, y - ry, 2 * rx, 2 * ry);
  g.fillRect(1490, 190, 210, 270);
  return m;
}
function buildPlate() {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  sky(g);
  CLOUDS_BACK.forEach((L, i) => cloudLayer(g, L, i));
  band(g, RIBBONS.leftB); band(g, RIBBONS.leftA);
  band(g, RIBBONS.rightB); band(g, RIBBONS.rightA);
  CLOUDS_FRONT.forEach((L, i) => cloudLayer(g, L, CLOUDS_BACK.length + i));
  for (const [x, y, rx, ry] of SPARKLES) sparkle(g, x, y, rx, ry);
  wordmark(g);
  tagline(g);
  grain(g, buildMask());
  return c;
}

// Paint the full card at film time t (opaque). The plate is built once (~0.2 s); a frame is one blit plus the owl.
export function paintCard(ctx, t) {
  if (!plate) plate = buildPlate();
  ctx.drawImage(plate, 0, 0);
  drawOwl(ctx, t);
}

// For the previous shot's owner: the card fading in over whatever is already on ctx. The dissolve starts at 135.78, inside
// s28's time (PLAN cuts to s40 at 136.0); s40 composites the rest itself, so this only draws before 136.0.
let layer = null;
export function overlayEndCard(ctx, t) {
  const a = cardAlpha(t);
  if (a <= 0 || t >= 136.0) return;
  if (!layer) { layer = document.createElement("canvas"); layer.width = W; layer.height = H; }
  const g = layer.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0);
  paintCard(g, t);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = a;
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
}

export function releaseCard() { plate = null; layer = null; }
