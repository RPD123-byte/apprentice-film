// s07 trace kit: redraws measured data (src/shots/s07/data/*.js, written by src/shots/s07/trace/) as a drawing.
//  - value zones: polygons, each with a quadratic tone field (a value study), rasterised at pixel centres;
//  - broad strokes: soft shading strokes, drawn opaque then blurred together with the zones;
//  - ink shapes: solid blacks and whites (outer ring + holes, even-odd), crisp;
//  - fine strokes: ink lines (dark on light, white on dark), each a centre-line with a width and a value per point,
//    drawn as round-capped segments with tapered ends;
//  - a value correction (a smooth signed field of zone quadratics) and a fine print texture (per-zone amplitude of a
//    procedural mesh / stipple), both measured against the source on this very drawing.
// Everything here is deterministic (hash noise, no Math.random); the arrays are measurements, never pixels.

// Warm paper tint of the B&W section, measured on the source (grey v -> R 1.014 v, G 1.0 v, B 0.985 v).
export const TINT = [1.014, 1.0, 0.985];
// traced widths are ink mass / peak; drawn as flat strokes they read ~10 % heavy (width sweep 0.6-1.15: 0.9 lowest error)
const FINE_WK = 0.9;

export function decode([kind, b64]) {
  const bin = atob(b64), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  if (kind === "i16") return new Int16Array(u8.buffer);
  if (kind === "u16") return new Uint16Array(u8.buffer);
  if (kind === "f32") return new Float32Array(u8.buffer);
  if (kind === "i8") return new Int8Array(u8.buffer);
  return u8;
}

// Zone ids: Int32Array (W*H), the zone owning each pixel (mirror of trace/raster.py fill_poly_ids + propagate).
export function zoneIds(W, H, ZN, ZP) {
  const ids = new Int32Array(W * H).fill(-1);
  let off = 0;
  const xs = [], ys = [];
  for (let k = 0; k < ZN.length; k++) {
    const n = ZN[k];
    xs.length = 0; ys.length = 0;
    let ymin = 1e9, ymax = -1e9;
    for (let i = 0; i < n; i++) { const x = ZP[off + 2 * i] / 2, y = ZP[off + 2 * i + 1] / 2; xs.push(x); ys.push(y); if (y < ymin) ymin = y; if (y > ymax) ymax = y; }
    off += 2 * n;
    const y0 = Math.max(0, Math.floor(ymin)), y1 = Math.min(H - 1, Math.ceil(ymax));
    const xi = [];
    for (let y = y0; y <= y1; y++) {
      const yc = y + 0.5;
      xi.length = 0;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, ya = ys[i], yb = ys[j];
        if ((ya <= yc && yb > yc) || (yb <= yc && ya > yc)) xi.push(xs[i] + ((yc - ya) * (xs[j] - xs[i])) / (yb - ya));
      }
      if (xi.length < 2) continue;
      xi.sort((a, b) => a - b);
      for (let q = 0; q + 1 < xi.length; q += 2) {
        const a = Math.max(0, Math.ceil(xi[q] - 0.5)), b = Math.min(W - 1, Math.floor(xi[q + 1] - 0.5));
        const row = y * W;
        for (let x = a; x <= b; x++) ids[row + x] = k;
      }
    }
  }
  // fill unassigned pixels from 4-neighbours (left, right, up, down), a few passes; each direction reads the state
  // before its own pass (as trace/raster.py propagate does)
  let un = [];
  for (let i = 0; i < W * H; i++) if (ids[i] < 0) un.push(i);
  for (let it = 0; it < 8 && un.length; it++) {
    for (const [dy, dx] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const upd = [];
      for (const i of un) {
        const x = i % W, y = (i - x) / W, sx = x + dx, sy = y + dy;
        if (sx < 0 || sx >= W || sy < 0 || sy >= H) continue;
        const v = ids[sy * W + sx]; if (v >= 0) upd.push(i, v);
      }
      for (let q = 0; q < upd.length; q += 2) ids[upd[q]] = upd[q + 1];
    }
    un = un.filter((i) => ids[i] < 0);
  }
  return ids;
}
// Zone field: per pixel the quadratic of its zone. ZC: (mx, my, c0..c5) per zone; CC (optional): other coefficient
// sets (6 per zone) evaluated about the same centres.
export function zoneField(W, H, ids, ZC, CC = null) {
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, k = Math.max(0, ids[i]), c = k * 8;
    const u = (x - ZC[c]) / 100, v = (y - ZC[c + 1]) / 100;
    const A = CC || ZC, o = CC ? k * 6 : c + 2;
    out[i] = A[o] + A[o + 1] * u + A[o + 2] * v + A[o + 3] * u * u + A[o + 4] * u * v + A[o + 5] * v * v;
  }
  return out;
}
// Three box passes (width 7) per axis, edges clamped: a Gaussian of sigma ~3.5 (mirror of trace/raster.py box3).
export function box3(F, W, H, r = 3) {
  const tmp = new Float32Array(Math.max(W, H)), n = 2 * r + 1;
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < H; y++) {
      const o = y * W;
      let s = 0;
      for (let k = -r; k <= r; k++) s += F[o + Math.min(W - 1, Math.max(0, k))];
      for (let x = 0; x < W; x++) {
        tmp[x] = s / n;
        s += F[o + Math.min(W - 1, x + r + 1)] - F[o + Math.max(0, x - r)];
      }
      for (let x = 0; x < W; x++) F[o + x] = tmp[x];
    }
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += F[Math.min(H - 1, Math.max(0, k)) * W + x];
      for (let y = 0; y < H; y++) {
        tmp[y] = s / n;
        s += F[Math.min(H - 1, y + r + 1) * W + x] - F[Math.max(0, y - r) * W + x];
      }
      for (let y = 0; y < H; y++) F[y * W + x] = tmp[y];
    }
  }
  return F;
}
// Print grain: per-pixel integer hash noise in frame coordinates, 3x3 box-softened, unit rms (mirror of
// trace/raster.py grain_pattern). Deterministic.
export function grainField(W, H, x0 = 0, y0 = 0) {
  const n = new Float32Array(W * H), o = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let h = (Math.imul((x + x0) >>> 0, 374761393) + Math.imul((y + y0) >>> 0, 668265263)) >>> 0;
    h = Math.imul((h ^ (h >>> 13)) >>> 0, 1274126177) >>> 0;
    h = (h ^ (h >>> 16)) >>> 0;
    n[y * W + x] = (h & 0xffff) / 65535 - 0.5;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s = 0;
    for (let dy = -1; dy <= 1; dy++) { const yy = Math.min(H - 1, Math.max(0, y + dy)) * W; for (let dx = -1; dx <= 1; dx++) s += n[yy + Math.min(W - 1, Math.max(0, x + dx))]; }
    o[y * W + x] = s / 9 / 0.0962;
  }
  return o;
}
const hash01 = (x, y, salt) => {
  let h = (Math.imul(x >>> 0, 374761393) + Math.imul(y >>> 0, 668265263) + salt) >>> 0;
  h = Math.imul((h ^ (h >>> 13)) >>> 0, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) & 0xffff) / 65535;
};
// value noise on a `cell` px lattice (smoothstep-bilinear), lattice values precomputed for the box
function vnoiseField(W, H, x0, y0, cell, salt) {
  const gx0 = Math.floor(x0 / cell), gy0 = Math.floor(y0 / cell), GW = Math.floor((x0 + W) / cell) - gx0 + 2, GH = Math.floor((y0 + H) / cell) - gy0 + 2;
  const L = new Float32Array(GW * GH);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) L[j * GW + i] = hash01(gx0 + i, gy0 + j, salt);
  const o = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const gy = (y + y0) / cell, iy = Math.floor(gy); let fy = gy - iy; fy = fy * fy * (3 - 2 * fy);
    const r0 = (iy - gy0) * GW, r1 = r0 + GW;
    for (let x = 0; x < W; x++) {
      const gx = (x + x0) / cell, ix = Math.floor(gx); let fx = gx - ix; fx = fx * fx * (3 - 2 * fx);
      const c = ix - gx0;
      o[y * W + x] = (L[r0 + c] * (1 - fx) + L[r0 + c + 1] * fx) * (1 - fy) + (L[r1 + c] * (1 - fx) + L[r1 + c + 1] * fx) * fy;
    }
  }
  return o;
}
// The print mesh (mirror of trace/raster.py mesh_pattern): fine lines rising to the right, period 3.4 px, whose phase
// and strength wander in 12-16 px patches, plus half-strength grain; unit rms.
// Fix pass 3: the regular diagonal mesh read as a faint moire at half scale (the source's cloth print is an irregular,
// grainy checker). The print texture is now a jittered checker: 2-3 px cells of hash noise on a lattice whose cell size
// wanders +-30 % in 14 px patches, mixed with the fine grain; unit rms like the mesh, so the per-zone amplitudes
// measured for the mesh (trace/texture.py) still set the same energy.
export function checkerField(W, H, x0 = 0, y0 = 0) {
  const g = grainField(W, H, x0, y0), o = new Float32Array(W * H);
  const SZ = vnoiseField(W, H, x0, y0, 14, 17);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, c = 2.5 * (0.7 + 0.6 * SZ[i]), X = x + x0, Y = y + y0;
    const cx = Math.floor(X / c), cy = Math.floor(Y / c);
    o[i] = ((hash01(cx, cy, 29) - 0.5) / 0.2887) * 0.8 + 0.6 * g[i];
  }
  let s2 = 0; for (let i = 0; i < o.length; i++) s2 += o[i] * o[i];
  const k = 1 / Math.sqrt(s2 / o.length || 1); for (let i = 0; i < o.length; i++) o[i] *= k;
  return o;
}
export function meshField(W, H, x0 = 0, y0 = 0) {
  const g = grainField(W, H, x0, y0), o = new Float32Array(W * H), k = 6.2832 / (3.4 * 1.41421);
  const PH = vnoiseField(W, H, x0, y0, 16, 7), AM = vnoiseField(W, H, x0, y0, 12, 11);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    o[i] = (Math.sin((x + x0 + y + y0) * k + PH[i] * 6.2832) * (0.3 + 0.7 * AM[i]) / 0.46 + 0.5 * g[i]) / 1.118;
  }
  return o;
}
export function zoneRaster(W, H, ZN, ZP, ZC) { return zoneField(W, H, zoneIds(W, H, ZN, ZP), ZC); }

export function putTone(ctx, W, H, tone, x0 = 0, y0 = 0) {
  const im = ctx.createImageData(W, H), d = im.data;
  for (let i = 0; i < W * H; i++) {
    const v = tone[i];
    d[4 * i] = v * TINT[0]; d[4 * i + 1] = v * TINT[1]; d[4 * i + 2] = v * TINT[2]; d[4 * i + 3] = 255;
  }
  ctx.putImageData(im, x0, y0);
}

const col = (v) => `rgb(${(v * 255 * TINT[0]).toFixed(1)},${(v * 255 * TINT[1]).toFixed(1)},${(v * 255 * TINT[2]).toFixed(1)})`;

// Strokes: Int16 [n, (x*8, y*8, w*20, v*1000) * n] ... ; keep(x, y, length, value) -> false skips a stroke (tested at
// its middle point), a number scales its width, { w, tl } scales it and tapers both ends to a point over tl px;
// wk scales every width.
// drop: a Set of stroke indices not to draw (strays measured against the source). bridge: { gap, vmax, cos } joins
// dark strokes (value <= vmax) whose ends face each other across a gap under `gap` px (both end directions within
// acos(cos) of the gap line) with a short segment of the thinner end's width - the tracer's hysteresis breaks
// continuous contours into runs; the drawing's contours are one line. bridge.region(x, y) limits it to an area.
export function drawStrokes(ctx, S, { taper = 0.6, dx = 0, dy = 0, keep = null, wk = 1, drop = null, bridge = null } = {}) {
  ctx.save();
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (bridge) drawBridges(ctx, S, bridge, dx, dy, wk, drop);
  let i = 0, idx = -1;
  while (i < S.length) {
    const n = S[i++], base = i;
    i += 4 * n; idx++;
    if (n < 2) continue;
    if (drop && drop.has(idx)) continue;
    let swk = 1, tl = 0, tlen = 0;
    if (keep) {
      const m = base + 4 * (n >> 1);
      let len = 0; for (let k = 0; k < n - 1; k++) { const a = base + 4 * k; len += Math.hypot(S[a + 4] - S[a], S[a + 5] - S[a + 1]) / 8; }
      const kf = keep(S[m] / 8, S[m + 1] / 8, len, S[m + 3] / 1000);
      if (!kf) continue;
      if (typeof kf === "object") { swk = kf.w ?? 1; tl = kf.tl ?? 0; tlen = len; }
      else swk = kf === true ? 1 : kf;
    }
    let arc = 0;
    for (let k = 0; k < n - 1; k++) {
      const a = base + 4 * k, b = a + 4;
      let w0 = S[a + 2] / 20, w1 = S[b + 2] / 20;
      if (k === 0) w0 *= taper;
      if (k === n - 2) w1 *= taper;
      if (tl > 0) {   // taper to a point over the last tl px at both ends
        const sl = Math.hypot(S[b] - S[a], S[b + 1] - S[a + 1]) / 8, a1 = arc + sl;
        w0 *= Math.min(1, Math.min(arc, tlen - arc) / tl); w1 *= Math.min(1, Math.min(a1, tlen - a1) / tl);
        arc = a1;
      }
      ctx.beginPath();
      ctx.moveTo(S[a] / 8 + dx, S[a + 1] / 8 + dy); ctx.lineTo(S[b] / 8 + dx, S[b + 1] / 8 + dy);
      ctx.lineWidth = Math.max(0.25, ((w0 + w1) / 2) * wk * swk);
      ctx.strokeStyle = col((S[a + 3] + S[b + 3]) / 2000);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawBridges(ctx, S, { gap = 6, vmax = 0.4, cos = 0.8, region = null } = {}, dx, dy, wk, drop) {
  // stroke ends: position, outward direction, width, value
  const E = [];
  let i = 0, idx = -1;
  while (i < S.length) {
    const n = S[i++], base = i; i += 4 * n; idx++;
    if (n < 2 || (drop && drop.has(idx))) continue;
    const P = (k) => [S[base + 4 * k] / 8, S[base + 4 * k + 1] / 8];
    const v = S[base + 3] / 1000; if (v > vmax) continue;
    for (const [e, f] of [[0, Math.min(2, n - 1)], [n - 1, Math.max(0, n - 3)]]) {
      const [x, y] = P(e), [fx, fy] = P(f), l = Math.hypot(x - fx, y - fy) || 1;
      if (region && !region(x, y)) continue;
      E.push({ s: idx, x, y, ux: (x - fx) / l, uy: (y - fy) / l, w: S[base + 4 * e + 2] / 20, v: S[base + 4 * e + 3] / 1000 });
    }
  }
  // grid hash of the ends
  const G = new Map(), key = (x, y) => `${Math.floor(x / gap)},${Math.floor(y / gap)}`;
  E.forEach((e, k) => { const q = key(e.x, e.y); if (!G.has(q)) G.set(q, []); G.get(q).push(k); });
  const used = new Uint8Array(E.length);
  for (let a = 0; a < E.length; a++) {
    if (used[a]) continue;
    const A = E[a], gx = Math.floor(A.x / gap), gy = Math.floor(A.y / gap);
    let best = -1, bd = gap;
    for (let yy = gy - 1; yy <= gy + 1; yy++) for (let xx = gx - 1; xx <= gx + 1; xx++) for (const b of G.get(`${xx},${yy}`) || []) {
      if (b === a || used[b] || E[b].s === A.s) continue;
      const B = E[b], vx = B.x - A.x, vy = B.y - A.y, d = Math.hypot(vx, vy);
      if (d < 0.5 || d >= bd || Math.abs(A.v - B.v) > 0.2) continue;
      if ((A.ux * vx + A.uy * vy) / d < cos || -(B.ux * vx + B.uy * vy) / d < cos) continue;
      best = b; bd = d;
    }
    if (best < 0) continue;
    const B = E[best]; used[a] = used[best] = 1;
    ctx.beginPath(); ctx.moveTo(A.x + dx, A.y + dy); ctx.lineTo(B.x + dx, B.y + dy);
    ctx.lineWidth = Math.max(0.25, Math.min(A.w, B.w) * wk * 0.9);
    ctx.strokeStyle = col((A.v + B.v) / 2); ctx.stroke();
  }
}

// Solid ink shapes: Int16 [nrings, v*1000, (npts, (x*2, y*2)*npts) * nrings] ... filled even-odd.
export function drawShapes(ctx, S, { dx = 0, dy = 0 } = {}) {
  let i = 0;
  while (i < S.length) {
    const nr = S[i++], v = S[i++] / 1000;
    ctx.beginPath();
    for (let r = 0; r < nr; r++) {
      const n = S[i++];
      for (let k = 0; k < n; k++) { const x = S[i + 2 * k] / 2 + dx, y = S[i + 2 * k + 1] / 2 + dy; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.closePath(); i += 2 * n;
    }
    ctx.fillStyle = col(v); ctx.fill("evenodd");
  }
}

export const canvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
// A software-rasterised 2D context. Canvases that are read back (getImageData) must be CPU canvases from their first
// use: a GPU canvas read back gives results that vary between browser sessions by up to ±9 levels after composite
// ops (measured), which would break the render's determinism across workers.
export const ctx2d = (c) => c.getContext("2d", { willReadFrequently: true });

// A traced layer: zones -> broad strokes -> blur -> ink shapes -> fine strokes -> correction -> texture. Returns a canvas of size W x H (frame px when
// x0 = y0 = 0; a sub-box otherwise, with the data in frame px).
export function paintTraced(D, W, H, { x0 = 0, y0 = 0, wk = FINE_WK, corr = true, fine = true, shapes = true, tex = true, fineDrop = null, bridge = null, fineKeep = null, beforeFine = null, broadKeep = null } = {}) {
  const ZN = decode(D.ZN), ZP = decode(D.ZP), ZC = decode(D.ZC);
  if (x0 || y0) { for (let i = 0; i < ZP.length; i += 2) { ZP[i] -= 2 * x0; ZP[i + 1] -= 2 * y0; } for (let k = 0; k < ZC.length; k += 8) { ZC[k] -= x0; ZC[k + 1] -= y0; } }
  // zone field evaluated in local coordinates: ZC centres were shifted above
  const ids = zoneIds(W, H, ZN, ZP);
  const tone = zoneField(W, H, ids, ZC);
  const A = canvas(W, H), a = ctx2d(A);
  putTone(a, W, H, tone);
  if (D.BROAD) drawStrokes(a, decode(D.BROAD), { dx: -x0, dy: -y0, keep: broadKeep });
  const B = canvas(W, H), b = ctx2d(B);
  b.drawImage(A, 0, 0);
  b.filter = `blur(${D.BLUR}px)`; b.drawImage(A, 0, 0); b.filter = "none";
  if (D.SHAPES && shapes) drawShapes(b, decode(D.SHAPES), { dx: -x0, dy: -y0 });
  if (beforeFine) beforeFine(B);   // a hook on the blurred tone + ink shapes, before the ink strokes go on
  if (D.FINE && fine) drawStrokes(b, decode(D.FINE), { dx: -x0, dy: -y0, wk, drop: fineDrop, bridge, keep: fineKeep });
  // measured value correction: a smooth signed field (zone quadratics, box-blurred) added over the finished layer,
  // fitted on the residual of this very drawing against the source (trace/correct.py); then the fine print texture,
  // amplitude per zone measured as the source's missing high-frequency energy (trace/texture.py), weighted to vanish
  // in pure black and white: the print mesh on mid-tone cloth, stipple grain on the bright owl, skin and paper
  const useC = D.CORR && corr, useT = D.TEX && tex;
  if (useC || useT) {
    const im = b.getImageData(0, 0, W, H), d = im.data;
    if (useC) {
      const F = box3(zoneField(W, H, ids, ZC, decode(D.CORR)), W, H);
      for (let i = 0; i < W * H; i++) { const v = F[i]; d[4 * i] += v * TINT[0]; d[4 * i + 1] += v * TINT[1]; d[4 * i + 2] += v * TINT[2]; }
    }
    if (useT) {
      const A = decode(D.TEX), P = checkerField(W, H, x0, y0), Q = grainField(W, H, x0, y0);
      const MW = new Float32Array(A.length);
      for (let k = 0; k < A.length; k++) { const m = Math.min(1, Math.max(0, (ZC[k * 8 + 2] / 255 - 0.65) / 0.15)); MW[k] = m * m * (3 - 2 * m); }
      for (let i = 0; i < W * H; i++) {
        const k = Math.max(0, ids[i]), a = A[k]; if (!a) continue;
        const v = (d[4 * i] + d[4 * i + 1] + d[4 * i + 2]) / 765, w = Math.min(1, 6 * v * (1 - v)), q = a * w * (P[i] * (1 - MW[k]) + Q[i] * MW[k]);
        d[4 * i] += q * TINT[0]; d[4 * i + 1] += q * TINT[1]; d[4 * i + 2] += q * TINT[2];
      }
    }
    b.putImageData(im, 0, 0);
  }
  return B;
}
