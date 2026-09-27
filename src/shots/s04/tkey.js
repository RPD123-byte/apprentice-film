// Rotoscoped keys for s04: every source frame of the segment is covered by a key drawing made from measurements of
// one source frame (snapshots/s04-k2/tr: trace_key.py, flow_key.py, tojs_d.py). A key stores
//   tone   : a value study of 14 values (simplified outlines of the regions darker than each level, measured on the
//            source with its lines removed, in paint values — the film's grade inverted), softened; extra-softened
//            where the source itself is soft (ds: its measured line energy is low, the motion-blurred room)
//   inkd / inkb : the solid inks — filled blacks (hair masses, pupils, lash lines) and white-ink highlights, each set
//            one measured value
//   dark / bright : the ink lines — centre lines (Hessian ridges, skeletonised, re-joined) with a width per point and
//            one ink value per line, redrawn with tapered strokes (dark lines on lit ground, pale lines on dark)
//   flows  : the measured motion (DIS optical flow, smoothed, on a 24 px grid) that carries the drawing to the
//            neighbouring source frames the key covers.
// No pixels are stored: outlines and lines are delta-coded point lists, flows are node displacements.
import { W, H } from "../../config.js";
import { hash } from "../../lib/rng.js";
import { hatcher, holdField, hatchRegion, anchorFor } from "./hatch.js";
import { HATCHFLOW } from "./hatchflow.js";

const ALPHA = []; for (let c = 35; c < 127; c++) if (c !== 92) ALPHA.push(String.fromCharCode(c));
const IDX = new Int16Array(128).fill(-1); ALPHA.forEach((ch, i) => { IDX[ch.charCodeAt(0)] = i; });
const d1 = (s, i) => IDX[s.charCodeAt(i)];
const d2 = (s, i) => d1(s, i) * 91 + d1(s, i + 1);
export const tkD1 = (s, i) => d1(s, i), tkD2 = (s, i) => d2(s, i);
const d3 = (s, i) => (d1(s, i) * 91 + d1(s, i + 1)) * 91 + d1(s, i + 2);

// outlines: 4 chars start point, then one char per step within +-4 px (9x9 codes), or an escape and two chars (+-45)
export function decodeRings(s) {
  const out = [];
  for (const part of s.split(" ")) {
    if (part.length < 4) continue;
    const pts = [];
    let x = d2(part, 0) - 1000, y = d2(part, 2) - 1000;
    pts.push(x, y);
    for (let i = 4; i < part.length;) {
      const c = d1(part, i);
      if (c < 81) { x += Math.floor(c / 9) - 4; y += (c % 9) - 4; i += 1; }
      else { x += d1(part, i + 1) - 45; y += d1(part, i + 2) - 45; i += 3; }
      pts.push(x, y);
    }
    out.push(Float32Array.from(pts));
  }
  return out;
}
// ink lines: 1 char value (/3), 3+3 chars start (half px, offset 2000), 1 char width (0.1 px); then per point
// dx, dy (half px, +-45) and width
export function decodeStrokes(s) {
  const out = [];
  if (!s) return out;
  for (const part of s.split(" ")) {
    if (part.length < 8) continue;
    const v = d1(part, 0) * 3;
    let x = d3(part, 1) - 2000, y = d3(part, 4) - 2000;
    const pts = [[x / 2, y / 2]], w = [d1(part, 7) / 10];
    for (let i = 8; i + 2 < part.length; i += 3) {
      x += d1(part, i) - 45; y += d1(part, i + 1) - 45;
      pts.push([x / 2, y / 2]); w.push(d1(part, i + 2) / 10);
    }
    out.push({ v, pts, w });
  }
  return out;
}
// flows: x plane then y plane, row-major deltas in 1/4 px (one char for -40..40, else escape + 2 chars absolute)
const FLOW_CACHE = new WeakMap();
function decodeFlow(K, off, n) {
  let per = FLOW_CACHE.get(K); if (!per) { per = {}; FLOW_CACHE.set(K, per); }
  if (per[off] !== undefined) return per[off];
  const s = K.flows && K.flows[String(off)];
  if (!s) return (per[off] = null);
  const f = new Float32Array(2 * n);
  let i = 0;
  for (let plane = 0; plane < 2; plane++) {
    let v = 0;
    for (let k = 0; k < n; k++) {
      const c = d1(s, i);
      if (c < 81) { v += c - 40; i += 1; } else { v = d2(s, i + 1) - 4000; i += 3; }
      f[2 * k + plane] = v / 4;
    }
  }
  return (per[off] = f);
}
function ringsPath(g, rings) {
  g.beginPath();
  for (const r of rings) {
    g.moveTo(r[0], r[1]);
    for (let k = 2; k < r.length; k += 2) g.lineTo(r[k], r[k + 1]);
    g.closePath();
  }
}
const grey = (v) => { const c = Math.max(0, Math.min(255, Math.round(v))); return `rgb(${c},${c},${c})`; };

// one tapered ink line: resampled every 2 px, widths interpolated, both ends tapered over 3 px
function inkLine(g, st, gain, endLen = 3) {
  const P = st.pts, n = P.length;
  if (n < 2) return;
  const S = [0];
  for (let i = 1; i < n; i++) S.push(S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const L = S[n - 1];
  if (L < 0.5) return;
  const m = Math.max(2, Math.floor(L / 2) + 1);
  const xs = new Float32Array(m), ys = new Float32Array(m), ws = new Float32Array(m);
  let j = 0;
  for (let k = 0; k < m; k++) {
    const s = (L * k) / (m - 1);
    while (j < n - 2 && S[j + 1] < s) j++;
    const u = Math.max(0, Math.min(1, (s - S[j]) / Math.max(1e-6, S[j + 1] - S[j])));
    xs[k] = P[j][0] + (P[j + 1][0] - P[j][0]) * u; ys[k] = P[j][1] + (P[j + 1][1] - P[j][1]) * u;
    const e = Math.min(1, s / endLen, (L - s) / endLen);
    ws[k] = (st.w[j] + (st.w[j + 1] - st.w[j]) * u) * (0.35 + 0.65 * Math.sqrt(Math.max(0, e)));
  }
  g.beginPath();
  const side = (sgn) => {
    const idx = sgn > 0 ? [...Array(m).keys()] : [...Array(m).keys()].reverse();
    for (const k of idx) {
      const a = Math.max(0, k - 1), b = Math.min(m - 1, k + 1);
      let dx = xs[b] - xs[a], dy = ys[b] - ys[a]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      const hw = (ws[k] / 2) * sgn;
      const px = xs[k] - dy * hw, py = ys[k] + dx * hw;
      if (sgn > 0 && k === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
  };
  side(1); side(-1);
  g.closePath(); g.fillStyle = grey(st.v * gain); g.fill();
}

// a tile of fine grain, stretched along the swing's motion it reads as the source's motion streaks (the lit texture
// of the boxes and shelves smeared by the move); built once, seeded
let STREAK = null;
function streakTile() {
  if (STREAK) return STREAK;
  const n = 256, c = document.createElement("canvas"); c.width = n; c.height = n;
  const g = c.getContext("2d"), d = g.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const v = 128 + 56 * (hash(x, y, 404) - 0.5) + 20 * (hash(x >> 2, y, 405) - 0.5);
    const k = 4 * (y * n + x); d.data[k] = d.data[k + 1] = d.data[k + 2] = v; d.data[k + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  return (STREAK = c);
}
// the key drawn on a canvas W+2M x H+2M (frame px of the key time, offset by M)
export function paintKey(K, M, opts = {}) {
  const { toneBlur = 1.2, gain = 1 } = opts;
  const cw = W + 2 * M, ch = H + 2 * M;
  const mk = () => { const c = document.createElement("canvas"); c.width = cw; c.height = ch; return c; };
  const out = mk(), g = out.getContext("2d");
  // the value study, softened
  const tc = mk(), tg = tc.getContext("2d");
  tg.fillStyle = "#000"; tg.fillRect(0, 0, cw, ch);
  tg.translate(M + 0.5, M + 0.5);   // traced coordinates are pixel indices: pixel centres sit at +0.5
  for (const [v, s] of K.tone) { ringsPath(tg, decodeRings(s)); tg.fillStyle = grey(v * gain); tg.fill("evenodd"); }
  tg.setTransform(1, 0, 0, 1, 0, 0);
  // the measured value correction of this key (s04/tcorr.js): paint-value offsets on a coarse grid, added to the study
  const TC = opts.tcorr;
  if (TC && TC.s) {
    const { g: gs, nx, ny } = TC, off = new Float32Array(nx * ny);
    for (let k = 0; k < nx * ny; k++) off[k] = d1(TC.s, k) - 45;
    const id = tg.getImageData(M, M, W, H), px = id.data;
    for (let y = 0; y < H; y++) {
      let fy = y / gs; fy = Math.max(0, Math.min(ny - 1.001, fy)); const j = Math.floor(fy), v = fy - j;
      for (let x = 0; x < W; x++) {
        let fx = x / gs; fx = Math.max(0, Math.min(nx - 1.001, fx)); const i = Math.floor(fx), u = fx - i, k = j * nx + i;
        const o = (off[k] * (1 - u) + off[k + 1] * u) * (1 - v) + (off[k + nx] * (1 - u) + off[k + nx + 1] * u) * v;
        const q = 4 * (y * W + x), c = px[q] + o;
        px[q] = px[q + 1] = px[q + 2] = c < 0 ? 0 : c > 255 ? 255 : c;
      }
    }
    tg.putImageData(id, M, M);
  }
  const edges = (c, cg) => {   // carry the frame's border rows/columns out into the margin (the flow pulls from there)
    cg.drawImage(c, M, M, 2, H, 0, M, M, H); cg.drawImage(c, M + W - 2, M, 2, H, M + W, M, M, H);
    cg.drawImage(c, 0, M, cw, 2, 0, 0, cw, M); cg.drawImage(c, 0, M + H - 2, cw, 2, 0, M + H, cw, M);
  };
  if (K.full) edges(tc, tg);
  const vc = mk(), vg = vc.getContext("2d");
  vg.filter = `blur(${toneBlur}px)`; vg.drawImage(tc, 0, 0); vg.filter = "none";
  g.drawImage(vc, 0, 0);
  // the mid-tones re-drawn as fine, low-contrast pen hatching (s04/hatch.js, fix2): one direction field for the whole
  // shot (the hold key's), laid in the hold frame's coordinates; opts.hatch = { hold, wk, xr } (see s04.js)
  const H0 = opts.hatch;
  if (H0 && H0.wk > 0 && H0.hold && H0.hold.dv) {
    g.drawImage(hatcher().run(vc, holdField(H0.hold, d1), hatchRegion(W, H), M, anchorFor(Math.round(K.t * 25), HATCHFLOW, { d1, d2 }), { wk: H0.wk, xr: H0.xr || [0, 0, 0, 0] }), 0, 0);
  }
  // where the source itself is soft (the motion-blurred room during the swing: its measured line energy is low) the
  // value study is softened further, so its bands do not read as hard posterised shapes
  // soft-region weight at a frame point (0..1)
  const soft = (x, y) => {
    if (!K.ds || !K.dgrid) return 0;
    const [nx, ny, st] = K.dgrid, i = Math.max(0, Math.min(nx - 1, Math.round(x / st))), j = Math.max(0, Math.min(ny - 1, Math.round(y / st)));
    return Math.min(1, d1(K.ds, j * nx + i) / 90);
  };
  let softW = null;   // the soft-region weight map (nx x ny), when the key has one
  if (K.ds && K.dgrid && (opts.softMix ?? 1) > 0) {
    const [nx, ny, st] = K.dgrid;
    const wc = document.createElement("canvas"); wc.width = nx; wc.height = ny;
    const wg = wc.getContext("2d"), wd = wg.createImageData(nx, ny);
    // the soft treatment is for the dark, motion-blurred room: lit things measured as 'soft' (the owl's smooth white
    // body, a clean cheek) must stay crisp, so the weight fades out where the study is bright
    const lc = document.createElement("canvas"); lc.width = nx; lc.height = ny; const lcg = lc.getContext("2d", { willReadFrequently: true });
    lcg.imageSmoothingEnabled = true; lcg.drawImage(tc, M - st / 2, M - st / 2, nx * st, ny * st, 0, 0, nx, ny);
    const ld = lcg.getImageData(0, 0, nx, ny).data, lo = opts.softLit0 ?? 130, hi = opts.softLit1 ?? 170;
    for (let k = 0; k < nx * ny; k++) {
      const lit = Math.max(0, Math.min(1, (ld[4 * k] - lo) / (hi - lo)));
      wd.data[4 * k] = wd.data[4 * k + 1] = wd.data[4 * k + 2] = 255; wd.data[4 * k + 3] = Math.round(Math.min(1, d1(K.ds, k) / 90) * (1 - lit) * 255);
    }
    wg.putImageData(wd, 0, 0);
    softW = wc;
    const b = mk(), bg = b.getContext("2d");
    const mv = K.mv || [0, 0], L = Math.hypot(mv[0], mv[1]) * (opts.shutter ?? 0.35);
    if (L > 6) {
      // a motion smear along the room's measured image motion (a 16-tap box by repeated halving), then a light blur:
      // the source's motion-blurred room is smeared along the swing, not blurred round
      const ux = mv[0] / Math.hypot(mv[0], mv[1]), uy = mv[1] / Math.hypot(mv[0], mv[1]);
      bg.drawImage(tc, 0, 0);
      for (let d = L / 16; d < L; d *= 2) { bg.globalAlpha = 0.5; bg.drawImage(b, ux * d, uy * d); }
      bg.globalAlpha = 1;
      bg.translate(-ux * L / 2, -uy * L / 2); bg.filter = `blur(${opts.softToneBlur ?? 4}px)`; bg.drawImage(b, 0, 0); bg.filter = "none"; bg.setTransform(1, 0, 0, 1, 0, 0);
      if ((opts.streaks ?? 0.5) > 0) {
        const pat = bg.createPattern(streakTile(), "repeat");
        pat.setTransform(new DOMMatrix().rotate((Math.atan2(uy, ux) * 180) / Math.PI).scale(Math.max(6, L * 0.8), 1.3));
        bg.globalCompositeOperation = "overlay"; bg.globalAlpha = opts.streaks ?? 0.5; bg.fillStyle = pat; bg.fillRect(0, 0, cw, ch);
        bg.globalAlpha = 1; bg.globalCompositeOperation = "source-over";
      }
    } else { bg.filter = `blur(${opts.softBlur ?? 8}px)`; bg.drawImage(tc, 0, 0); bg.filter = "none"; }
    bg.globalCompositeOperation = "destination-in"; bg.imageSmoothingEnabled = true;
    bg.drawImage(wc, M - st / 2, M - st / 2, nx * st, ny * st);
    bg.globalCompositeOperation = "source-over";
    g.globalAlpha = opts.softMix ?? 1; g.drawImage(b, 0, 0); g.globalAlpha = 1;
  }
  if (opts.noInk) return out;   // (dev: the value study alone)
  // (fix1) anything drawn under the ink (his authored eyes), and the traced ink dropped inside given polygons
  if (opts.under) { g.save(); opts.under(g); g.restore(); }
  const dropP = opts.dropIn || [];
  const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const dropFn = opts.dropFn || null;   // (x, y) -> true: traced ink there is dropped
  const dropped = (pts) => { if (!dropP.length && !dropFn) return false; let n = 0; for (const [x, y] of pts) if ((dropFn && dropFn(x, y)) || dropP.some((P) => inPoly(x, y, P))) n++; return n > 0.55 * pts.length; };
  const ringPts = (r) => { const a = []; for (let k = 0; k < r.length; k += 2) a.push([r[k], r[k + 1]]); return a; };
  // the solid inks (filled blacks, white-ink highlights), then the ink lines
  g.save(); g.translate(M + 0.5, M + 0.5); g.lineJoin = "round";
  // small fragments are dropped: in the soft (motion-blurred) room the tracer's specks along region edges, and
  // everywhere the shortest traced strokes (they read as dashes and crosses rather than lines)
  const minLen = opts.minLen ?? 6, minLenSoft = opts.minLenSoft ?? 12, minArea = opts.minAreaSoft ?? 150;
  const keepRing = (r) => {
    if ((dropP.length || dropFn) && r.length < 400 && dropped(ringPts(r))) return false;
    if (soft(r[0], r[1]) < 0.5) return true;
    let a = 0; for (let k = 0; k < r.length; k += 2) { const j = (k + 2) % r.length; a += r[k] * r[j + 1] - r[j] * r[k + 1]; }
    return Math.abs(a) / 2 >= minArea;
  };
  const strokeLen = (st) => { let L = 0; for (let i = 1; i < st.pts.length; i++) L += Math.hypot(st.pts[i][0] - st.pts[i - 1][0], st.pts[i][1] - st.pts[i - 1][1]); return L; };
  const keepStroke = (st) => {
    const L = strokeLen(st), p = st.pts[Math.floor(st.pts.length / 2)];
    return L >= minLen && (L >= minLenSoft || soft(p[0], p[1]) < 0.5);
  };
  const darkSt = decodeStrokes(K.dark).filter((st) => keepStroke(st) && !dropped(st.pts));
  // (opts.thinEdge: the traced dark lines along the lit figure's edge against the dark room -- one side of the line lit
  // (> ~170 in the study), the other dark (< ~70), sampled 5 px either side -- are thinned to <= 1.5 px and lightened;
  // the source draws that edge as the lit face meeting the dark, with at most a hairline)
  if (opts.thinEdge) {
    const td = tg.getImageData(0, 0, cw, ch).data;
    const V = (x, y) => { const X = Math.round(x + M), Y = Math.round(y + M); if (X < 0 || Y < 0 || X >= cw || Y >= ch) return 0; return td[4 * (Y * cw + X)]; };
    for (const st of darkSt) {
      const P = st.pts, n = P.length; if (n < 2) continue;
      let hit = 0, tot = 0;
      for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 8))) {
        const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
        let dx = b[0] - a[0], dy = b[1] - a[1]; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
        const v1 = V(P[i][0] - dy * 5, P[i][1] + dx * 5), v2 = V(P[i][0] + dy * 5, P[i][1] - dx * 5);
        tot++; if (Math.max(v1, v2) > 170 && Math.min(v1, v2) < 70) hit++;
      }
      if (hit > 0.6 * tot) { st.w = st.w.map((w) => Math.min(1.5, w * 0.6)); st.v = Math.max(st.v, 70); }
    }
  }
  if (softW && (opts.softInk ?? 1) > 0) {
    // fix1: in the soft (motion-blurred) room the solid blacks are soft too. The tracer's black regions there have
    // ragged, speckled edges and bite holes into the dark grey box faces (paint 15-35), and every key traces them
    // differently, so drawn hard they boiled through the swing. There: islands and holes under ~400 px^2 are dropped
    // (a closing and an opening of the region), and the region is smeared along the room's measured motion (as the
    // value study is) and blurred; the crisp version stays wherever the room is not soft (the figure, lit things).
    g.restore();
    const [nx, ny, st] = K.dgrid;
    const minA = opts.softInkArea ?? 400;
    const keepSoft = (r) => {
      let a = 0; for (let k = 0; k < r.length; k += 2) { const j = (k + 2) % r.length; a += r[k] * r[j + 1] - r[j] * r[k + 1]; }
      return Math.abs(a) / 2 >= minA || soft(r[0], r[1]) < 0.5;
    };
    const mv = K.mv || [0, 0], Ls = Math.hypot(mv[0], mv[1]) * (opts.shutter ?? 0.35);
    for (const [v, s] of (K.inkd || [])) {
      const rings = decodeRings(s);
      const crisp = mk(), cg = crisp.getContext("2d");
      cg.translate(M + 0.5, M + 0.5); ringsPath(cg, rings.filter(keepRing)); cg.fillStyle = "#fff"; cg.fill("evenodd"); cg.setTransform(1, 0, 0, 1, 0, 0);
      const sm = mk(), sg = sm.getContext("2d");
      sg.translate(M + 0.5, M + 0.5); ringsPath(sg, rings.filter(keepSoft)); sg.fillStyle = "#fff"; sg.fill("evenodd"); sg.setTransform(1, 0, 0, 1, 0, 0);
      const sb = mk(), sbg = sb.getContext("2d");
      if (Ls > 6) {
        const ux = mv[0] / Math.hypot(mv[0], mv[1]), uy = mv[1] / Math.hypot(mv[0], mv[1]);
        for (let d = Ls / 16; d < Ls; d *= 2) { sg.globalAlpha = 0.5; sg.drawImage(sm, ux * d, uy * d); }
        sg.globalAlpha = 1;
        sbg.translate(-ux * Ls / 2, -uy * Ls / 2);
      }
      sbg.filter = `blur(${opts.softInkBlur ?? 3.5}px)`; sbg.drawImage(sm, 0, 0); sbg.filter = "none"; sbg.setTransform(1, 0, 0, 1, 0, 0);
      // weights: crisp x (1 - w), soft x w
      sbg.globalCompositeOperation = "destination-in"; sbg.imageSmoothingEnabled = true; sbg.drawImage(softW, M - st / 2, M - st / 2, nx * st, ny * st);
      cg.globalCompositeOperation = "destination-out"; cg.imageSmoothingEnabled = true; cg.drawImage(softW, M - st / 2, M - st / 2, nx * st, ny * st);
      cg.globalCompositeOperation = "lighter"; cg.globalAlpha = opts.softInkAlpha ?? 0.72; cg.drawImage(sb, 0, 0); cg.globalAlpha = 1;
      cg.globalCompositeOperation = "source-in"; cg.fillStyle = grey(v * gain); cg.fillRect(0, 0, cw, ch);
      g.drawImage(crisp, 0, 0);
    }
    g.save(); g.translate(M + 0.5, M + 0.5); g.lineJoin = "round";
  } else for (const [v, s] of (K.inkd || [])) { ringsPath(g, decodeRings(s).filter(keepRing)); g.fillStyle = grey(v * gain); g.fill("evenodd"); }
  for (const [v, s] of (K.inkb || [])) { ringsPath(g, decodeRings(s).filter(keepRing)); g.fillStyle = grey(v * gain); g.fill("evenodd"); }
  for (const st of darkSt) { if (opts.darkMap) opts.darkMap(st); inkLine(g, st, gain); }
  // (opts.dimBright(x, y) -> null | {v, w} | {drop}: white-ink lines there get their value and width scaled, or are
  // dropped, e.g. the lid's rim)
  for (const st of decodeStrokes(K.bright)) if (keepStroke(st) && !dropped(st.pts)) {
    if (opts.dimBright) { const p = st.pts[Math.floor(st.pts.length / 2)], f = opts.dimBright(p[0], p[1]); if (f) { if (f.drop) continue; st.v *= f.v; st.w = st.w.map((w) => w * f.w); } }
    inkLine(g, st, gain);
  }
  // the laptop screen is not part of the drawing (s04 maps the page onto it): cut it out
  if (K.cut && K.cut.length) {
    g.globalCompositeOperation = "destination-out"; g.fillStyle = "#fff";
    g.beginPath(); for (const P of K.cut) { g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.closePath(); }
    g.fill(); g.globalCompositeOperation = "source-over";
  }
  g.restore();
  return out;
}

// the mesh that shows a key at one of its covered frames: output vertices on the flow grid (frame px), uv = where
// that frame pixel sits in the key (p + flow(p)), for Warper.draw. off 0 = the key frame itself.
export function keyMesh(K, off, M) {
  const cw = W + 2 * M, ch = H + 2 * M;
  const [nx, ny, step] = K.fgrid || [Math.floor(W / 24) + 2, Math.floor(H / 24) + 2, 24];
  const cols = nx - 1, rows = ny - 1;
  const pos = new Float32Array(nx * ny * 2), uv = new Float32Array(nx * ny * 2);
  const F = off ? decodeFlow(K, off, nx * ny) : null;
  for (let j = 0, k = 0; j < ny; j++) for (let i = 0; i < nx; i++, k++) {
    const x = i * step, y = j * step;
    let fx = 0, fy = 0;
    if (F) { fx = F[2 * k]; fy = F[2 * k + 1]; }
    pos[2 * k] = x; pos[2 * k + 1] = y;
    uv[2 * k] = (x + fx + M) / cw; uv[2 * k + 1] = (y + fy + M) / ch;
  }
  return { cols, rows, pos, uv };
}
