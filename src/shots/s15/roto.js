// s15 roto faces (fix pass 3, extended to every take in pass 4). The source corridor is not a rigid set: its drawn
// boxes slide, swell and change shape from frame to frame while the camera runs, so the scenery is not rebuilt in 3D.
// Instead every visible face of every source frame is measured as a screen quad (four corners picked on the source
// frame's coordinate grid; pass 4: snapshots/s15-p4/roto/<frame>.txt, some carried to the next frame by dense flow and
// corrected by hand) with its brightness (a robust four-corner fit of the source's value, through the inverse grade,
// over the part of the quad that shows, refined against renders), its stroke direction (structure tensor) and hatch
// gain, and a coarse value grid for the floor between the faces. Only those numbers are stored (roto*.js; tools in
// snapshots/s15-p4/tools/); the faces are drawn here through the shared corridor shader, so they carry its engraving,
// grain and inked edges.
//
// A quad is placed in the world by back-projecting its corners through the sub-frame's camera at depths 1/q (the
// projective-interpolation trick: q from the diagonals' intersection), so the shader maps the face's own surface
// (u, v in 0..1) onto the screen quad by the exact homography, and its hatching stays glued to the face.
// Between source frames the corners are interpolated (the motion-blur sub-frames); a face that has no counterpart in
// the neighbouring frame keeps its own corners.
import { rect, rectUp, buildAtlas, AT } from "./atlas.js";
// pictures that roto faces show upright (canvas y = 0 at the face's top edge)
const UPRIGHT = new Set(["shelfA", "shelfB", "shelfC", "shelfD", "rackE", "monitor", "speaker", "speakerI", "boxwall"]);

// mean value (R) of each atlas picture, so a measured face keeps its measured brightness whatever its picture
const MEAN = new Map();
function texNorm(name) {
  if (MEAN.has(name)) return MEAN.get(name);
  let k = 1;
  try {
    const cv = buildAtlas(), r = rect(name);
    const x = Math.round(r[0] * AT), y = Math.round(r[1] * AT), w = Math.max(1, Math.round(r[2] * AT)), h = Math.max(1, Math.round(r[3] * AT));
    const d = cv.getContext("2d").getImageData(x, y, w, h).data;
    let sum = 0, n = 0;
    for (let i = 0; i < d.length; i += 16) { sum += d[i] * (1 - d[i + 1] / 255); n++; }
    const m = sum / Math.max(1, n) / 255;
    // (fix 2: cap 8, not 4: the redrawn gear pictures are mostly near-black with light strokes (means ~0.12-0.2), and
    // the old cap left their faces ~10-30% darker than their measured values)
    k = Math.min(8, 0.88 / Math.max(0.05, m));
  } catch (e) { k = 1; }
  MEAN.set(name, k);
  return k;
}

const W = 2206, H = 946, K = (H / 2) / Math.tan((60 * Math.PI) / 360);

// camera basis (as camMatrix / author.viewYP)
function basis(c) {
  const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
  const f = [sy * cp, sp, cy * cp], r = [cy, 0, -sy], u = [-sy * sp, cp, -cy * sp];
  const cr = Math.cos(c.roll), sr = Math.sin(c.roll);
  const r2 = r.map((v, i) => v * cr - u[i] * sr), u2 = r.map((v, i) => v * sr + u[i] * cr);
  return { f, r: r2, u: u2, e: c.eye };
}
// projective weights of a screen quad [p0..p3]; 1s when it is not convex
function qw(p) {
  const d1 = [p[2][0] - p[0][0], p[2][1] - p[0][1]], d2 = [p[3][0] - p[1][0], p[3][1] - p[1][1]];
  const den = d1[0] * d2[1] - d1[1] * d2[0];
  if (Math.abs(den) < 1e-9) return [1, 1, 1, 1];
  const ax = p[1][0] - p[0][0], ay = p[1][1] - p[0][1];
  const s = (ax * d2[1] - ay * d2[0]) / den, t = (ax * d1[1] - ay * d1[0]) / den;
  if (!(s > 0.001 && s < 0.999 && t > 0.001 && t < 0.999)) return [1, 1, 1, 1];
  const c = [p[0][0] + d1[0] * s, p[0][1] + d1[1] * s];
  const d = p.map((q) => Math.hypot(q[0] - c[0], q[1] - c[1]));
  return [0, 1, 2, 3].map((i) => Math.min(40, Math.max(0.025, (d[i] + d[(i + 2) % 4]) / Math.max(1e-6, d[(i + 2) % 4]))));
}
const hs = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973; return h; };

// a far stack face's rows and boxes per row: from the face's median on-screen size over the take (so the split does
// not change from frame to frame): rows ~70 px tall, boxes ~1.3x as wide as tall, 3-7 rows
function stackOf(data, id) {
  const C = data._stk || (data._stk = {});
  if (C[id]) return C[id];
  const us = [], vs = [];
  for (const rows of Object.values(data.frames)) for (const r of rows) if (r[0] === id) {
    us.push(Math.hypot((r[3] - r[1] + r[5] - r[7]) / 2, (r[4] - r[2] + r[6] - r[8]) / 2));
    vs.push(Math.hypot((r[7] - r[1] + r[5] - r[3]) / 2, (r[8] - r[2] + r[6] - r[4]) / 2));
  }
  us.sort((a, b) => a - b); vs.sort((a, b) => a - b);
  const pu = us[us.length >> 1] || 400, pv = vs[vs.length >> 1] || 300;
  // (fix 2: 3-5 rows of >= ~90 px (median size); 3-7 rows of ~70 px read as a tile grid)
  const n = Math.max(3, Math.min(5, Math.floor(pv / 90)));
  const m = Math.max(1, Math.round((pu / (pv / n)) / 1.3));
  return (C[id] = [n, m]);
}

// data: { frames: { f: [[id, x0,y0, x1,y1, x2,y2, x3,y3, v0,v1,v2,v3], ...] }, faces: { id: { tex, style, ink, top, su, sv } } }
// tf: the frame's film time (a source frame), ts: the sub-frame's time (<= tf), c: the sub-frame's camera
export function rotoFaces(data, tf, ts, c, out = [], decals = null, over = null) {
  const fr = data._fr || (data._fr = Object.keys(data.frames).map(Number).sort((a, b) => a - b));
  const f = Math.round(tf * 25);
  let i = fr.indexOf(f);
  if (i < 0) { i = 0; for (let j = 0; j < fr.length; j++) if (fr[j] <= f) i = j; }
  const cur = data.frames[fr[i]];
  const back = Math.max(0, (tf - ts) * 25);
  // the neighbour the sub-frame leans toward: the previous source frame (a held frame counts as no motion), or at the
  // start of a take the next frame, extrapolated backward
  let nb = null, w = 0;
  if (back > 1e-4) {
    if (i > 0 && fr[i] - fr[i - 1] <= 2) { nb = data.frames[fr[i - 1]]; w = back; }
    else if (i + 1 < fr.length && fr[i + 1] - fr[i] <= 2) { nb = data.frames[fr[i + 1]]; w = -back; }
  }
  const nbm = nb ? (nb._m || (nb._m = Object.fromEntries(nb.map((r) => [r[0], r])))) : null;
  const B = basis(c), S = 1.2;
  for (const row of cur) {
    const id = row[0], o = data.faces[id] || {};
    const q = nbm && nbm[id];
    const P = [];
    for (let k = 0; k < 4; k++) {
      let x = row[1 + 2 * k], y = row[2 + 2 * k];
      if (q) { x += (q[1 + 2 * k] - x) * w; y += (q[2 + 2 * k] - y) * w; }
      P.push([x, y]);
    }
    // (fix 1b: over[id].splitX: the face is cut at that frame x; the override (vmul / hk) applies to its left part
    // only, the right part keeps its measured values (take I's far wall: black behind the owl, the gear to the right
    // keeps its tone). The cut is linear in screen space: these are fronto-parallel far faces.)
    const ov = over && over[id];
    const tv0 = [row[9], row[10], row[11], row[12]];
    const sx = ov && ov.splitX !== undefined ? (ov.splitX - (P[0][0] + P[3][0]) / 2) / Math.max(1, (P[1][0] + P[2][0]) / 2 - (P[0][0] + P[3][0]) / 2) : -1;
    if (sx > 0.02 && sx < 0.98) {
      const L = (a2, b2) => [a2[0] + (b2[0] - a2[0]) * sx, a2[1] + (b2[1] - a2[1]) * sx];
      const mb = L(P[0], P[1]), mt = L(P[3], P[2]), vb = tv0[0] + (tv0[1] - tv0[0]) * sx, vt = tv0[3] + (tv0[2] - tv0[3]) * sx;
      pushFace(out, data, id, o, [P[0], mb, mt, P[3]], [tv0[0], vb, vt, tv0[3]].map((x) => x * (ov.vmul ?? 1)), ov.hk, B, S, decals, fr[i], ov);
      pushFace(out, data, id + "~r", o, [mb, P[1], P[2], mt], [vb, tv0[1], tv0[2], vt], undefined, B, S, null, fr[i], null);
    } else {
      // (no cut: the override applies to the whole face, or with splitX, only when the face lies left of the cut)
      const on = ov && (ov.splitX === undefined || sx >= 0.98);
      const tv = on && ov.vmul !== undefined ? tv0.map((x) => x * ov.vmul) : tv0;
      pushFace(out, data, id, o, P, tv, on ? ov.hk : undefined, B, S, decals, fr[i], ov);
    }
  }
  return out;
}

// one measured face: back-project its screen quad P through the sub-frame's camera and push it for the shader
function pushFace(out, data, id, o, P, tv, hkOver, B, S, decals, fk0, ov) {
  const Q = qw(P);
  const pts = P.map(([x, y], k) => {
    const a = (x - W / 2) / K, b = -(y - H / 2) / K, z = S / Q[k];
    return [B.e[0] + z * (B.f[0] + B.r[0] * a + B.u[0] * b), B.e[1] + z * (B.f[1] + B.r[1] * a + B.u[1] * b), B.e[2] + z * (B.f[2] + B.r[2] * a + B.u[2] * b)];
  });
  // (fix 1) px per face u / v at the face's centre (edge ink and rub streaks are sized in px), the measured box
  // details (decals.js: a handle slot / label outline [u, v, w, h] and a flap or tape seam) of this face
  const Pu = Math.hypot((P[1][0] - P[0][0] + P[2][0] - P[3][0]) / 2, (P[1][1] - P[0][1] + P[2][1] - P[3][1]) / 2);
  const Pv = Math.hypot((P[3][0] - P[0][0] + P[2][0] - P[1][0]) / 2, (P[3][1] - P[0][1] + P[2][1] - P[1][1]) / 2);
  const dcl = decals && decals[id];
  // (fix 1) far stack faces (the box-wall picture before): rows x boxes, fixed per face id from its median shape
  const sid = id.endsWith("~r") ? id.slice(0, -2) : id;
  const stk = o.tex === "boxwall" || (ov && ov.stack) ? stackOf(data, sid) : null;
  const cs = [];
  if (dcl) { const fk = String(fk0); if (dcl.p1[fk]) cs.push(...dcl.p1[fk]); if (dcl.p2 && dcl.p2[fk]) cs.push(...dcl.p2[fk]); }
  out.push({ pe: [Pu, Pv, cs.length > 2 ? cs[2] : -9, cs.length > 2 ? cs[3] : -9], dc: cs.length ? [cs[0], cs[1], dcl.wh[0], dcl.wh[1]] : [0, 0, 0, 0], q: pts, n: o.top ? [0, 1, 0] : [0, 0, -1], su: o.su ?? 1, sv: o.sv ?? 1, at: stk ? rect("plain") : UPRIGHT.has(o.tex) ? rectUp(o.tex) : rect(o.tex ?? "plain"), alb: stk ? texNorm("plain") : texNorm(o.tex ?? "plain"), st: stk ? stk[0] : 0, sc: stk ? stk[1] : 0, ang: 7, sp: 0.006,
    ink: o.ink ?? 1, seed: hs(sid) % 97, style: o.style ?? 0, tv, ha: o.ha ?? 0, hk: hkOver !== undefined ? hkOver : o.hk ?? -1 });
}

// the measured floor of a roto take at frame time tf / sub-frame ts: { x, y, v } for the shader's floor grid, or null
export function rotoFloor(data, tf, ts) {
  if (!data.floor || !data.floorGrid) return null;
  const fr = data._ff || (data._ff = Object.keys(data.floor).map(Number).sort((a, b) => a - b));
  if (!fr.length) return null;
  const f = Math.round(tf * 25);
  let i = fr.indexOf(f);
  if (i < 0) { i = 0; for (let j = 0; j < fr.length; j++) if (fr[j] <= f) i = j; }
  let v = data.floor[fr[i]];
  const back = Math.max(0, (tf - ts) * 25);
  if (back > 1e-4) {
    let nb = null, w = 0;
    if (i > 0 && fr[i] - fr[i - 1] <= 2) { nb = data.floor[fr[i - 1]]; w = back; }
    else if (i + 1 < fr.length && fr[i + 1] - fr[i] <= 2) { nb = data.floor[fr[i + 1]]; w = -back; }
    if (nb) v = v.map((a, k) => a + (nb[k] - a) * w);
  }
  return { x: data.floorGrid.x, y: data.floorGrid.y, v };
}

// how far the measured faces move between this source frame and the previous one (median corner shift, px): sets
// how many motion-blur sub-frames the frame needs
export function rotoMotion(data, tf) {
  const fr = data._fr || (data._fr = Object.keys(data.frames).map(Number).sort((a, b) => a - b));
  const f = Math.round(tf * 25);
  let i = fr.indexOf(f);
  if (i < 0) { i = 0; for (let j = 0; j < fr.length; j++) if (fr[j] <= f) i = j; }
  const j = i > 0 && fr[i] - fr[i - 1] <= 2 ? i - 1 : (i + 1 < fr.length && fr[i + 1] - fr[i] <= 2 ? i + 1 : -1);
  if (j < 0) return 0;
  const a = data.frames[fr[i]], b = data.frames[fr[j]];
  const bm = b._m || (b._m = Object.fromEntries(b.map((r) => [r[0], r])));
  const d = [];
  for (const r of a) { const q = bm[r[0]]; if (!q) continue; for (let k = 0; k < 4; k++) d.push(Math.hypot(q[1 + 2 * k] - r[1 + 2 * k], q[2 + 2 * k] - r[2 + 2 * k])); }
  if (!d.length) return 0;
  d.sort((x, y) => x - y);
  return d[d.length >> 1];
}
