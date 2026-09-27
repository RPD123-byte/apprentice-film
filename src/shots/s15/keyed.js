// s15 keyed boxes from tracked corners. The source corridor is not rigid from frame to frame (the drawn boxes slide and
// breathe while the camera runs), so the big near boxes are placed anew in every source frame from corners tracked on
// the source (dense optical flow + template snapping, snapshots/s15-sfm/seed.py; the numbers are in tracks*.js), each
// through that frame's camera, with constructions that stay well conditioned:
//   front: a face square to the view or through two floor corners; its depth from a corner on the floor (or on the
//          box below), the other corners from rays meeting that plane;
//   side:  a corridor-facing side in the plane x = const through a floor corner; near/far ends and height from rays
//          meeting that plane.
// Between source frames the box parameters are interpolated (author.keyed), so motion blur sub-frames stay smooth.
import { viewOf } from "./author.js";

// tracks: { name: { f0, n, p: [[x, y] per frame, per point] } } -> point (x, y) of track name, point i, frame f
function pt(T, spec, f) {
  if (!spec) return null;
  const [name, i, a, b] = spec;
  const tr = T[name]; if (!tr) return null;
  if ((a !== undefined && f < a) || (b !== undefined && f > b)) return null;
  const k = f - tr.f0; if (k < 0 || k >= tr.p.length) return null;
  const q = tr.p[k][i]; return q && q[0] !== null ? q : null;
}
// one box in the view v from screen points P = { bl, br, tl, tr } (front) or { nb, fb, nt, ft } (side)
export function buildBox(v, kind, P, o, y0) {
  if (kind === "front") {
    const yaw0 = o.yaw ?? 0;
    const e = v.eye;
    // footprint points: bottom corners on the plane y = y0, or top corners on y = y0 + h when the height is known
    let A = P.bl ? v.atY(P.bl[0], P.bl[1], y0) : null, B = P.br ? v.atY(P.br[0], P.br[1], y0) : null;
    const good = (q) => q && isFinite(q[0]) && (q[2] - e[2]) > 0.05 && (q[2] - e[2]) < 30;
    if (!good(A)) A = null; if (!good(B)) B = null;
    if (!A && !B && o.h !== undefined && (P.tl || P.tr) && !o.noTopHit) {
      const TA = P.tl ? v.atY(P.tl[0], P.tl[1], y0 + o.h) : null, TB = P.tr ? v.atY(P.tr[0], P.tr[1], y0 + o.h) : null;
      if (good(TA)) A = [TA[0], y0, TA[2]]; if (good(TB)) B = [TB[0], y0, TB[2]];
    }
    let n;
    if (A && B && !o.square) { const ux = B[0] - A[0], uz = B[2] - A[2], L = Math.hypot(ux, uz); n = [-uz / L, 0, ux / L]; }
    else n = [Math.sin(yaw0), 0, Math.cos(yaw0)];   // (pointing away from the camera for yaw 0)
    let p0 = A || B;
    if (!p0 || o.zAbs !== undefined) {
      if (o.zAbs !== undefined) { p0 = [e[0], y0, o.zAbs]; if (!(A && B) || o.square) n = [Math.sin(yaw0), 0, Math.cos(yaw0)]; A = B = null; }
      else if (o.z !== undefined) p0 = [e[0], y0, e[2] + o.z];
      else return null;
    }
    const onPlane = (q) => {
      if (!q) return null;
      const d = v.atZ(q[0], q[1], e[2] + 1); const r = [d[0] - e[0], d[1] - e[1], d[2] - e[2]];
      const den = r[0] * n[0] + r[2] * n[2]; if (Math.abs(den) < 1e-6) return null;
      const t = ((p0[0] - e[0]) * n[0] + (p0[2] - e[2]) * n[2]) / den; if (t <= 0.01 || t > 40) return null;
      return [e[0] + r[0] * t, e[1] + r[1] * t, e[2] + r[2] * t];
    };
    const TL = onPlane(P.tl), TR = onPlane(P.tr);
    if (!A && P.bl) A = onPlane(P.bl); if (!B && P.br) B = onPlane(P.br);
    const u = [n[2], 0, -n[0]];   // along the face, left -> right as seen
    const hs = [TL, TR].filter(Boolean).map((q) => q[1] - y0);
    const h = o.h ?? (hs.length ? hs.reduce((a2, b2) => a2 + b2, 0) / hs.length : 0.4);
    let L = A || (TL && [TL[0], y0, TL[2]]), R = B || (TR && [TR[0], y0, TR[2]]);
    if (!L && !R) return null;
    const w = o.w ?? 0.5;
    if (!L) L = [R[0] - u[0] * w, y0, R[2] - u[2] * w];
    if (!R) R = [L[0] + u[0] * w, y0, L[2] + u[2] * w];
    const ux = R[0] - L[0], uz = R[2] - L[2], W = Math.hypot(ux, uz);
    if (W < 0.02 || !(h > 0.02) || h > 3) return null;
    const yaw = Math.atan2(-uz / W, ux / W), d = o.d ?? 0.4;
    return { x: (L[0] + R[0]) / 2 + Math.sin(yaw) * d / 2, y: y0, z: (L[2] + R[2]) / 2 + Math.cos(yaw) * d / 2, w: W, h, d, yaw };
  }
  // side: plane x = xs (side -1: box on the left, face looks +x; +1: on the right)
  const side = o.side ?? -1;
  let xs = o.xs;
  const fl = P.fb || P.nb;
  if (fl && o.xs === undefined) xs = v.atY(fl[0], fl[1], y0)[0];
  if (xs === undefined) return null;
  const hit = (q) => (q ? v.atX(q[0], q[1], xs) : null);
  const NB = hit(P.nb), FB = hit(P.fb), NT = hit(P.nt), FT = hit(P.ft);
  const zs = [NB, NT].filter((q) => q && q[2] > v.eye[2] - 0.5).map((q) => q[2]);
  const zf = [FB, FT].filter(Boolean).map((q) => q[2]);
  let zn = zs.length ? Math.min(...zs) : undefined, zfar = zf.length ? Math.max(...zf) : undefined;
  if (zn === undefined && zfar !== undefined) zn = zfar - (o.len ?? 1);
  if (zfar === undefined && zn !== undefined) zfar = zn + (o.len ?? 1);
  if (zn === undefined) return null;
  if (o.len && o.fixLen) zfar = zn + o.len;
  const hs = [NT, FT].filter(Boolean).map((q) => q[1] - y0);
  const h = o.h ?? (hs.length ? hs.reduce((a, b) => a + b, 0) / hs.length : 0.4);
  const w = o.w ?? 0.6;
  if (!(zfar - zn > 0.02) || !(h > 0.02)) return null;
  const x0 = side < 0 ? xs - w : xs, x1 = side < 0 ? xs : xs + w;
  return { x: (x0 + x1) / 2, y: y0, z: (zn + zfar) / 2, w: x1 - x0, h, d: zfar - zn, yaw: 0 };
}
// defs: [{ id, kind, f: [f0, f1], p: { bl: [track, i, f0?, f1?], ... }, d, w, h, y0 (number | parent id), alb, b, ... }]
// lights (optional): { id: { frame: [front, left, right, top] } } measured face values (lights*.js)
export function addKeyedTracks(A, cam, T, defs, frames, lights = {}) {
  const sol = {};
  for (const df of defs) {
    const K = A.keyed({ pre: df.pre ?? 0.025, post: df.post ?? 0.025 });
    K.id = df.id;
    // measured values per face; frames without a measurement for a face take the nearest measured frame (<= 3 away)
    const L0 = lights[df.id] || {}, LT = {};
    const fr = Object.keys(L0).map(Number).sort((a, b) => a - b);
    for (const f of frames) {
      const v = [-1, -1, -1, -1];
      for (let j = 0; j < 4; j++) {
        let best = -1, bd = 4;
        for (const g of fr) { const x = L0[g][j]; if (x !== -1 && !(typeof x === "number" && x < 0) && Math.abs(g - f) < bd) { bd = Math.abs(g - f); best = x; } }
        v[j] = best;
      }
      if (v.some((x) => x !== -1)) LT[f] = v;
    }
    sol[df.id] = {};
    for (const f of frames) {
      if (f < df.f[0] || f > df.f[1]) continue;
      const t = Math.round(f * 4) / 100;
      const v = viewOf(cam(t));
      const P = {};
      for (const [k, s] of Object.entries(df.p)) { const q = pt(T, s, f); if (q) P[k] = q; }
      let y0 = df.y0 ?? 0;
      if (typeof y0 === "string") { const pb = sol[y0][f]; if (!pb) continue; y0 = pb.y + pb.h; }
      let o = df;
      if (df.zOf) { const rb = sol[df.zOf][f]; if (!rb) continue; o = { ...df, zAbs: rb.z - rb.d / 2 + (df.dz ?? 0) }; }
      if (df.xsOf) { const rb = sol[df.xsOf][f]; if (!rb) continue; o = { ...o, xs: (df.side ?? -1) < 0 ? rb.x + rb.w / 2 + (df.dx ?? 0) : rb.x - rb.w / 2 + (df.dx ?? 0) }; }
      const b = buildBox(v, df.kind, P, o, y0);
      if (!b) continue;
      sol[df.id][f] = b;
      const tv = LT[f] || LT[String(f)];
      const bs = [{ ...b, alb: df.alb ?? 0.95, ...(df.b || {}), ...(tv ? { tv } : {}) }];
      // o.stack: boxes piled on this one with the same footprint (heights), slightly offset, lit normally
      let y = b.y + b.h;
      const tvOf = (j) => { const L2 = lights[df.id + "#" + j]; const v2 = L2 && (L2[f] || L2[String(f)]); return v2 ? { tv: v2 } : {}; };
      (df.stack || []).forEach((hh, j) => { bs.push({ ...b, y, h: hh, x: b.x + 0.01 * (j % 2 ? 1 : -1), w: b.w * (0.97 + 0.03 * (j % 2)), alb: (df.alb ?? 0.95) * 0.95, ...(df.sb || {}), ...tvOf(j + 1) }); y += hh; });
      K.world(t, bs);
    }
  }
  return sol;
}
