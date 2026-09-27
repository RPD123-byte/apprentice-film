// s15 layout authoring in screen space: boxes are placed by where their faces sit in the FIRST frame of a take
// (measured on the source grid images), back-projected through that frame's camera.
import { rng } from "../../lib/rng.js";
import { boxFaces, kbQuad, panel } from "./build.js";
import { rect } from "./atlas.js";

// height at which the vertical line through world point P (x,z) meets screen row sy
function hitVert(v, sy, P) { return v.heightAt(P, sy); }

export const W = 2206, H = 946, FOV = 60;
export const K = (H / 2) / Math.tan((FOV * Math.PI) / 360);
export const HC = 0.33;
// camera orientation that puts the corridor's vanishing point (+z) at screen (vx, vy)
export function aim(vx, vy) {
  const pitch = Math.atan((vy - H / 2) / K);
  const yaw = -Math.atan(((vx - W / 2) * Math.cos(pitch)) / K);
  return { yaw, pitch };
}
export function view(vx, vy, eye = [0, HC, 0], roll = 0) {
  const { yaw, pitch } = aim(vx, vy);
  return viewYP(yaw, pitch, eye, roll);
}
// the view of a camera state from a set's path ({ eye, yaw, pitch, roll })
export const viewOf = (c) => viewYP(c.yaw, c.pitch, c.eye, c.roll);
function viewYP(yaw, pitch, eye, roll) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const f = [sy * cp, sp, cy * cp], r = [cy, 0, -sy], u = [-sy * sp, cp, -cy * sp];
  const cr = Math.cos(roll), sr = Math.sin(roll);
  const r2 = r.map((v, i) => v * cr - u[i] * sr), u2 = r.map((v, i) => v * sr + u[i] * cr);
  const ray = (sx, sy2) => { const a = (sx - W / 2) / K, b = -(sy2 - H / 2) / K; return [f[0] + r2[0] * a + u2[0] * b, f[1] + r2[1] * a + u2[1] * b, f[2] + r2[2] * a + u2[2] * b]; };
  const hit = (d, axis, val) => { const t = (val - eye[axis]) / d[axis]; return [eye[0] + d[0] * t, eye[1] + d[1] * t, eye[2] + d[2] * t]; };
  return {
    eye, yaw, pitch, roll,
    floor: (sx, sy2) => hit(ray(sx, sy2), 1, 0),
    heightAt: (P, sy2) => {
      const a = [P[0] - eye[0], 0, P[2] - eye[2]], m = (H / 2 - sy2) / K;
      const af = a[0] * f[0] + a[2] * f[2], au = a[0] * u2[0] + a[2] * u2[2];
      return eye[1] + (m * af - au) / (u2[1] - m * f[1]);
    },
    project: (p) => {
      const d = [p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]];
      const z = d[0] * f[0] + d[1] * f[1] + d[2] * f[2];
      return [W / 2 + ((d[0] * r2[0] + d[1] * r2[1] + d[2] * r2[2]) * K) / z, H / 2 - ((d[0] * u2[0] + d[1] * u2[1] + d[2] * u2[2]) * K) / z, z];
    },
    atZ: (sx, sy2, z) => hit(ray(sx, sy2), 2, z),
    atX: (sx, sy2, x) => hit(ray(sx, sy2), 0, x),
    atY: (sx, sy2, y) => hit(ray(sx, sy2), 1, y),
  };
}

// An author for one take: collects boxes, then emits faces.
export function author(v, seed = 1, shared = null) {
  const r = rng(seed);
  const boxes = shared ? shared.boxes : [];
  const A = {
    // the same author seen through another frame's camera (to place things where they sit in a later frame)
    at(v2) { const B = author(v2, seed + 7919, A); B.kbs = A.kbs = A.kbs || []; A.panels = A.panels || []; A.walls = A.walls || []; A.clears = A.clears || []; A.decals = A.decals || []; return B; },
    v, boxes, r,
    // a box whose front face (facing the camera) spans screen x0..x1, bottom yb .. top yt in the first frame.
    // Z comes from the floor under its bottom edge unless o.z is given (then o.y0 = bottom height, or from yb).
    front(x0, x1, yb, yt, d, o = {}) {
      let z;
      let yBot;
      if (o.z !== undefined) { z = o.z; yBot = o.y0 ?? v.atZ(x0, yb, z)[1]; }
      else { const p = v.floor((x0 + x1) / 2, yb); z = p[2]; yBot = 0; }
      const X0 = v.atZ(x0, yb, z)[0], X1 = v.atZ(x1, yb, z)[0];
      const yTop = v.atZ(x0, yt, z)[1];
      const b = { x: (X0 + X1) / 2, y: yBot, z: z + d / 2, w: X1 - X0, h: yTop - yBot, d, alb: o.alb ?? 0.92, seed: Math.floor(r() * 1e6), yaw: o.yaw ?? (r() - 0.5) * 0.04, ...o.b };
      boxes.push(b);
      // boxes stacked above to the top of the world, each a little offset
      if (o.stack !== false) {
        let y = yTop;
        const tops = o.tops ?? [];
        let i = 0;
        const top = o.top ?? 1.5 + r() * 0.8;
        while (y < top) {
          const h = tops[i] !== undefined ? v.atZ(x0, tops[i], z)[1] - y : 0.28 + r() * 0.14;
          const jx = (o.jx ?? 0.03) * (r() - 0.5), jz = (o.jz ?? 0.05) * (r() - 0.5);
          const ww = b.w * (0.92 + r() * 0.14), dd = d * (0.9 + r() * 0.15);
          boxes.push({ x: b.x + jx, y, z: z + dd / 2 + jz, w: ww, h, d: dd, alb: (o.alb ?? 0.92) * (0.9 + r() * 0.12), seed: Math.floor(r() * 1e6), yaw: (r() - 0.5) * 0.05, ...o.sb });
          y += h; i++;
        }
      }
      return { z, X0, X1, yTop, b };
    },
    // a box whose front face (square to the corridor) sits Z units ahead of this frame's eye, spanning screen
    // x0..x1 (measured at the face's bottom row, or at the eye row when the bottom is off-frame), top at screen row
    // yt; bottom at height o.y0 (default the floor). Returns the box.
    fz(x0, x1, yt, Z, d, o = {}) {
      const z = v.eye[2] + Z, yBot = o.y0 ?? 0;
      const ry = o.row ?? 473;
      const X0 = v.atZ(x0, ry, z)[0], X1 = v.atZ(x1, ry, z)[0];
      const yTop = o.h !== undefined ? yBot + o.h : v.atZ(x0, yt, z)[1];
      const b = { x: (X0 + X1) / 2, y: yBot, z: z + d / 2, w: X1 - X0, h: yTop - yBot, d, alb: o.alb ?? 0.92, seed: Math.floor(r() * 1e6), yaw: o.yaw ?? 0, ...o.b };
      boxes.push(b);
      if (o.under) boxes.push({ ...b, y: 0, h: yBot, seed: Math.floor(r() * 1e6), alb: (o.alb ?? 0.92) * 0.85 });
      if (o.stack) {
        let y = yTop;
        const top = o.top ?? 1.5 + r() * 0.8;
        while (y < top) {
          const h = 0.28 + r() * 0.14;
          boxes.push({ x: b.x + (r() - 0.5) * 0.03, y, z: b.z + (r() - 0.5) * 0.04, w: b.w * (0.92 + r() * 0.12), h, d: d * (0.9 + r() * 0.15), alb: (o.alb ?? 0.92) * (0.85 + r() * 0.12), seed: Math.floor(r() * 1e6), yaw: (r() - 0.5) * 0.04, ...o.sb });
          y += h;
        }
      }
      return b;
    },
    // a box seen mostly by its corridor-facing side: that face lies in the plane x = xs; nearTop / farTop are the screen
    // points of its near and far top corners in this frame (or o.nearX / o.farX at the eye row with o.h). side -1 = the
    // box stands on the left (its lit face looks +x), +1 = on the right. w = its width away from the corridor.
    sb(side, nearTop, farTop, xs, w, o = {}) {
      const q0 = nearTop ? v.atX(nearTop[0], nearTop[1], xs) : v.atX(o.nearX, 473, xs), q1 = farTop ? v.atX(farTop[0], farTop[1], xs) : v.atX(o.farX, 473, xs);
      const y0 = o.y0 ?? 0, h = o.h ?? ((q0[1] + q1[1]) / 2 - y0);
      const x0 = side < 0 ? xs - w : xs, x1 = side < 0 ? xs : xs + w;
      const b = { x: (x0 + x1) / 2, y: y0, z: (q0[2] + q1[2]) / 2, w: x1 - x0, h, d: Math.abs(q1[2] - q0[2]), alb: o.alb ?? 0.92, seed: Math.floor(r() * 1e6), yaw: 0, ...o.b };
      boxes.push(b);
      if (o.stack) {
        let y = y0 + h;
        const top = o.top ?? 1.5 + r() * 0.8;
        while (y < top) {
          const hh = 0.28 + r() * 0.14;
          boxes.push({ ...b, y, h: hh, x: b.x + (r() - 0.5) * 0.02, z: b.z + (r() - 0.5) * 0.03, d: b.d * (0.9 + r() * 0.15), alb: (o.alb ?? 0.92) * (0.85 + r() * 0.14), seed: Math.floor(r() * 1e6), yaw: (r() - 0.5) * 0.04, ...o.sb });
          y += hh;
        }
      }
      return b;
    },
    // A keyed (moving) object: the same box(es) measured in several frames, each placement made through that frame's
    // camera (K.at(t, view, b => b.front(...))). Between keys the box parameters are interpolated in time, so the box
    // lands on its measured place in every key frame whatever the error of the camera path in between (the source's
    // corridor is not perfectly rigid). Outside the keys it keeps moving with the nearest segment's velocity for
    // o.pre / o.post seconds, then it is dropped.
    keyed(o = {}) {
      const root = shared || A;
      root.tracks = root.tracks || [];
      const K = { keys: [], o, seed: Math.floor(r() * 1e6) };
      root.tracks.push(K);
      K.at = (t, v2, fn) => {
        const tmp = author(v2, K.seed);
        fn(tmp);
        const bs = tmp.boxes.map((b) => ({ ...b }));
        if (K.keys.length) K.keys[0].boxes.forEach((b0, i) => { if (bs[i]) bs[i].seed = b0.seed; });
        K.keys.push({ t, boxes: bs });
        K.keys.sort((a, b) => a.t - b.t);
        return K;
      };
      // a key given directly in world units (boxes fitted offline from tracked corners: s15/keys*.js)
      K.world = (t, boxes) => {
        const bs = boxes.map((b, i) => ({ alb: 0.92, ...b, seed: K.keys.length ? K.keys[0].boxes[i]?.seed ?? K.seed + i : b.seed ?? K.seed + i }));
        K.keys.push({ t, boxes: bs });
        K.keys.sort((a, b) => a.t - b.t);
        return K;
      };
      K.eval = (t) => {
        const ks = K.keys;
        if (!ks.length) return [];
        const pre = o.pre ?? 0.3, post = o.post ?? 0.3;
        if (t < ks[0].t - pre || t > ks[ks.length - 1].t + post) return [];
        let a = ks[0], b = ks[ks.length - 1];
        if (ks.length === 1) return a.boxes;
        if (t <= ks[0].t) { a = ks[0]; b = ks[1]; }
        else if (t >= ks[ks.length - 1].t) { a = ks[ks.length - 2]; b = ks[ks.length - 1]; }
        else for (let i = 1; i < ks.length; i++) if (t <= ks[i].t) { a = ks[i - 1]; b = ks[i]; break; }
        const f = (t - a.t) / (b.t - a.t);
        const n = Math.min(a.boxes.length, b.boxes.length), out = [];
        const lerpK = ["x", "y", "z", "yaw"], sizeK = ["w", "h", "d", "alb"];
        const fs = Math.max(0, Math.min(1, f));
        for (let i = 0; i < n; i++) {
          const p = a.boxes[i], q = b.boxes[i], m = { ...p };
          for (const k of lerpK) m[k] = (p[k] ?? 0) + ((q[k] ?? 0) - (p[k] ?? 0)) * f;
          for (const k of sizeK) m[k] = (p[k] ?? 0) + ((q[k] ?? 0) - (p[k] ?? 0)) * fs;
          if (p.tv || q.tv) {
            const a2 = p.tv || [-1, -1, -1, -1], b2 = q.tv || [-1, -1, -1, -1];
            const neg = (x) => x === -1 || (typeof x === "number" && x < 0);
            const mix4 = (x, y) => { const X = typeof x === "number" ? [x, x, x, x] : x, Y = typeof y === "number" ? [y, y, y, y] : y; return X.map((xx, k) => xx + (Y[k] - xx) * fs); };
            m.tv = a2.map((x, j) => (neg(x) || neg(b2[j]) ? (fs < 0.5 ? x : b2[j]) : mix4(x, b2[j])));
          }
          out.push(m);
        }
        return out;
      };
      return K;
    },
    // faces of the keyed objects at film time t
    dynFaces(t, out = []) {
      const root = shared || A;
      for (const K of root.tracks || []) K.eval(t).forEach((b, j) => { const n0 = out.length; boxFaces(b, out); for (let i = n0; i < out.length; i++) out[i].kb = j ? K.id + "#" + j : K.id; });
      return out;
    },
    // a world-space box (x0..x1, z0..z1, y0..y1) plus an optional stack above
    box(x0, x1, z0, z1, y0, y1, o = {}) {
      const b = { x: (x0 + x1) / 2, y: y0, z: (z0 + z1) / 2, w: x1 - x0, h: y1 - y0, d: z1 - z0, alb: o.alb ?? 0.92, seed: Math.floor(r() * 1e6), yaw: o.yaw ?? (r() - 0.5) * 0.04, ...o.b };
      boxes.push(b);
      if (o.stack) {
        let y = y1;
        const top = o.top ?? 1.5 + r() * 0.8;
        while (y < top) {
          const h = 0.28 + r() * 0.14;
          boxes.push({ x: b.x + (r() - 0.5) * 0.04, y, z: b.z + (r() - 0.5) * 0.05, w: b.w * (0.92 + r() * 0.14), h, d: b.d * (0.9 + r() * 0.15), alb: (o.alb ?? 0.92) * (0.9 + r() * 0.12), seed: Math.floor(r() * 1e6), yaw: (r() - 0.5) * 0.05, ...o.sb });
          y += h;
        }
      }
      return b;
    },
    // a wall of stacked box columns with inner face at x (side -1 = left wall, +1 = right) from z0 to z1
    // keep the generated walls out of a floor-plan rectangle (for panels placed by hand)
    clear(x0, x1, z0, z1) { (shared ? shared.clears : (A.clears = A.clears || [])).push({ x0, x1, z0, z1 }); },
    // walls are generated when the faces are emitted, so they can step back behind everything authored by hand
    wall(side, x, z0, z1, o = {}) { (shared ? shared.walls : (A.walls = A.walls || [])).push([side, x, z0, z1, o]); },
    genWall(side, x, z0, z1, o, obst) {
      let z = z0;
      while (z < z1) {
        const d = (o.dmin ?? 0.32) + r() * ((o.dmax ?? 0.52) - (o.dmin ?? 0.32));
        // columns step in and out: most sit back, some jut into the corridor (their fronts catch the light);
        // now and then a gap (a dark void into the stacks behind)
        const jr = r();
        if (jr < (o.gaps ?? 0.03)) { z += d * 0.6; continue; }
        const jut = (o.jut ?? 0.1) * (jr < 0.45 ? -0.35 + r() * 0.2 : jr < 0.8 ? r() * 0.3 : 0.45 + r() * 0.3);
        let xin = x - side * jut;
        // step back behind hand-placed things in this stretch
        for (const q of obst) if (q.z1 > z - 0.02 && q.z0 < z + d + 0.02) {
          if (side < 0 && q.x1 > xin - 1.2 && q.x0 < xin + 0.02) xin = Math.min(xin, q.x0 - 0.02);
          if (side > 0 && q.x0 < xin + 1.2 && q.x1 > xin - 0.02) xin = Math.max(xin, q.x1 + 0.02);
        }
        const top = (o.top ?? 3.0) * (0.7 + r() * 0.5);
        const cyaw = (r() - 0.5) * (o.yaw ?? 0.12);
        let y = 0;
        while (y < top) {
          const h = (o.hmin ?? 0.26) + r() * ((o.hmax ?? 0.42) - (o.hmin ?? 0.26));
          const w = (o.w ?? 0.5) * (0.75 + r() * 0.4);
          const jx = (r() - 0.5) * (o.jx ?? 0.07) - side * 0.03;
          const x0 = side < 0 ? xin - w : xin, x1 = side < 0 ? xin : xin + w;
          boxes.push({ x: (x0 + x1) / 2 + jx * (side < 0 ? (jx < 0 ? 1 : 0) : (jx > 0 ? 1 : 0)), y, z: z + d / 2 + (r() - 0.5) * 0.04, w, h: h * 0.995, d: d * (0.9 + r() * 0.1), alb: (o.alb ?? 0.88) * (0.85 + r() * 0.2), seed: Math.floor(r() * 1e6), yaw: cyaw + (r() - 0.5) * 0.06 });
          y += h;
        }
        z += d;
      }
    },
    // A (possibly turned) box from screen points in this frame: its front face's lower edge given either on the floor
    // (bl, br = screen points of the bottom corners) or at height o.y0; ty = screen y of the top of the front face at
    // bl (sets the height); d = depth behind the face. o.stack piles boxes on top up to o.top.
    vb(bl, br, ty, d, o = {}) {
      const y0 = o.y0 ?? 0;
      const P0 = v.atY(bl[0], bl[1], y0), P1 = v.atY(br[0], br[1], y0);
      const ux = P1[0] - P0[0], uz = P1[2] - P0[2], w = Math.hypot(ux, uz);
      const yaw = Math.atan2(-uz / w, ux / w);
      const h = o.h ?? (hitVert(v, ty, P0) - y0);
      // local -z (the front normal) maps to (-sin yaw, -cos yaw); the box centre sits d/2 behind the face
      const nx = Math.sin(yaw), nz = Math.cos(yaw);
      const cx = (P0[0] + P1[0]) / 2 + nx * d / 2, cz = (P0[2] + P1[2]) / 2 + nz * d / 2;
      const b = { x: cx, y: y0, z: cz, w, h, d, yaw, alb: o.alb ?? 0.92, seed: Math.floor(r() * 1e6), ...o.b };
      boxes.push(b);
      if (o.stack) {
        let y = y0 + h;
        const top = o.top ?? 1.5 + r() * 0.8;
        while (y < top) {
          const hh = 0.28 + r() * 0.14;
          boxes.push({ ...b, y, h: hh, w: w * (0.9 + r() * 0.15), d: d * (0.9 + r() * 0.15), x: cx + (r() - 0.5) * 0.04, z: cz + (r() - 0.5) * 0.04, yaw: yaw + (r() - 0.5) * 0.08, alb: (o.alb ?? 0.92) * (0.88 + r() * 0.14), seed: Math.floor(r() * 1e6), ...o.sb });
          y += hh;
        }
      }
      return b;
    },
    // the same, from the screen points of the face's TOP corners (tl, tr) and the box height h (bottom at o.y0, default
    // the floor): for near boxes whose foot is below the frame
    vt(tl, tr, h, d, o = {}) {
      const y0 = o.y0 ?? 0, yt = y0 + h;
      const T0 = v.atY(tl[0], tl[1], yt), T1 = v.atY(tr[0], tr[1], yt);
      const ux = T1[0] - T0[0], uz = T1[2] - T0[2], w = Math.hypot(ux, uz);
      const yaw = Math.atan2(-uz / w, ux / w);
      const nx = Math.sin(yaw), nz = Math.cos(yaw);
      const b = { x: (T0[0] + T1[0]) / 2 + nx * d / 2, y: y0, z: (T0[2] + T1[2]) / 2 + nz * d / 2, w, h, d, yaw, alb: o.alb ?? 0.92, seed: Math.floor(r() * 1e6), ...o.b };
      boxes.push(b);
      return b;
    },
    // a box given by the screen points of one face's four corners [bl, br, tr, tl] (bottom corners on the floor, or at
    // o.y0): the face's height comes from the top corners (mean of both)
    vq(q, d, o = {}) {
      const [bl, br, tr, tl] = q, y0 = o.y0 ?? 0;
      const P0 = v.atY(bl[0], bl[1], y0), P1 = v.atY(br[0], br[1], y0);
      const h = o.h ?? Math.max(0.02, (v.heightAt(P0, tl[1]) + v.heightAt(P1, tr[1])) / 2 - y0);
      return A.vb(bl, br, 0, d, { ...o, h });
    },
    // a vertical picture panel (shelving, gear, speaker) from its screen bottom corners (on the floor or at o.y0)
    // and the screen y of its top edge at bl; o.back adds a dark casing behind it (depth)
    vp(bl, br, ty, tex, o = {}) {
      const y0 = o.y0 ?? 0;
      const P0 = v.atY(bl[0], bl[1], y0), P1 = v.atY(br[0], br[1], y0);
      const h = o.h ?? (hitVert(v, ty, P0) - y0);
      (shared ? shared.panels : (A.panels = A.panels || [])).push({ P0, P1, y0, h, tex, o });
      if (o.back) {
        const ux = P1[0] - P0[0], uz = P1[2] - P0[2], w = Math.hypot(ux, uz), yaw = Math.atan2(-uz / w, ux / w);
        const nx = Math.sin(yaw), nz = Math.cos(yaw), d = o.back;
        boxes.push({ x: (P0[0] + P1[0]) / 2 + nx * (d / 2 + 0.005), y: y0, z: (P0[2] + P1[2]) / 2 + nz * (d / 2 + 0.005), w, h, d, yaw, alb: o.backAlb ?? 0.45, seed: Math.floor(r() * 1e6), noFront: true, ...o.b });
      }
    },
    // a flat picture lying on the floor (a cable coil, a rug of paper) from four screen points on the floor
    decal(p0, p1, p2, p3, tex, o = {}) {
      const P = [p0, p1, p2, p3].map((p) => { const q = v.floor(p[0], p[1]); q[1] = o.lift ?? 0.004; return q; });
      (shared ? shared.decals : (A.decals = A.decals || [])).push({ P, tex, o });
    },
    // a leaning keyboard from screen points: bottom-left (panel side) and bottom-right on the floor, top-left at the
    // bottom-left's depth (+dz)
    kb(bl, br, tl, o = {}) {
      const BL = v.floor(bl[0], bl[1]), BR = v.floor(br[0], br[1]);
      const TL = v.atZ(tl[0], tl[1], BL[2] + (o.dz ?? 0));
      (shared ? shared.kbs : (A.kbs = A.kbs || [])).push([BL, BR, TL, o]);
    },
    faces(out) {
      if (shared) return shared.faces(out);
      for (const p of A.panels || []) {
        const { P0, P1, y0, h, tex, o } = p;
        const ux = P1[0] - P0[0], uz = P1[2] - P0[2], w = Math.hypot(ux, uz);
        const c = [(P0[0] + P1[0]) / 2, y0 + h / 2, (P0[2] + P1[2]) / 2];
        panel(c, [ux / w, 0, uz / w], [0, -1, 0], w, h, tex, { alb: o.alb ?? 1.05, ink: o.ink ?? 0.6 }, out);
      }
      // footprints of everything placed by hand (boxes, keyboards, panels): the walls keep clear of them
      const obst = [];
      const fp = (pts) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); } obst.push({ x0, x1, z0, z1 }); };
      for (const b of boxes) { const c = Math.cos(b.yaw || 0), s2 = Math.sin(b.yaw || 0), pts = []; for (const [ax, az] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const dx = ax * b.w / 2, dz = az * b.d / 2; pts.push([b.x + dx * c + dz * s2, 0, b.z - dx * s2 + dz * c]); } fp(pts); }
      for (const k of A.kbs || []) fp([k[0], k[1], k[2], [k[1][0] + k[2][0] - k[0][0], 0, k[1][2] + k[2][2] - k[0][2]]]);
      for (const p of A.panels || []) fp([p.P0, p.P1]);
      for (const c of A.clears || []) obst.push(c);
      for (const K of A.tracks || []) if (!K.o.noClear) for (const k of K.keys) for (const b of k.boxes) { const c = Math.cos(b.yaw || 0), s2 = Math.sin(b.yaw || 0), pts = []; for (const [ax, az] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const dx = ax * b.w / 2, dz = az * b.d / 2; pts.push([b.x + dx * c + dz * s2, 0, b.z - dx * s2 + dz * c]); } fp(pts); }
      for (const w of A.walls || []) A.genWall(w[0], w[1], w[2], w[3], w[4], obst);
      for (const k of A.kbs || []) kbQuad(k[0], k[1], k[2], out, k[3]);
      for (const d of A.decals || []) {
        const [a, b, c, e] = d.P;
        out.push({ q: [a, b, c, e], n: [0, 1, 0], su: Math.hypot(b[0] - a[0], b[2] - a[2]), sv: Math.hypot(e[0] - a[0], e[2] - a[2]), at: rect(d.tex), alb: d.o.alb ?? 1.0, ang: 0, sp: 0.005, ink: 0.4, seed: 13, style: 1, decal: 1 });
      }
      for (const b of boxes) boxFaces(b, out);
      return out;
    },
  };
  return A;
}
