// A tiny perspective camera for stroke-rendered 3D: project points, then draw faces as ink.
// Hatching is laid out in each face's own (u,v) plane, so it stays glued to the surface as the camera moves.
import { hatch, taper, INK } from "./ink.js";

export const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};

// eye, target, up, vertical fov in degrees, viewport size.
export function camera(eye, target, fovDeg, W, H, up = [0, 1, 0]) {
  const f = v3.norm(v3.sub(target, eye));
  const r = v3.norm(v3.cross(f, up));
  const u = v3.cross(r, f);
  const k = (H / 2) / Math.tan((fovDeg * Math.PI) / 360);
  return {
    eye, f, r, u, k, W, H,
    // screen [x, y, depth]; depth <= near means behind the camera
    project(p) {
      const d = v3.sub(p, eye);
      const z = v3.dot(d, f);
      const zz = Math.max(z, 0.01);
      return [W / 2 + (v3.dot(d, r) * k) / zz, H / 2 - (v3.dot(d, u) * k) / zz, z];
    },
  };
}

// A quad face: corners p0..p3 (counter-clockwise seen from outside), a base tone and a hatch direction in face space.
// light: fn(normal, center) -> brightness 0..1. Draws a black fill, hatch strokes scaled by brightness, and an inked edge.
export function drawQuad(ctx, cam, q, o = {}) {
  const P = q.map((p) => cam.project(p));
  if (P.some((p) => p[2] < 0.05)) return;
  const n = v3.norm(v3.cross(v3.sub(q[1], q[0]), v3.sub(q[3], q[0])));
  const c = v3.mul(v3.add(v3.add(q[0], q[1]), v3.add(q[2], q[3])), 0.25);
  if (o.cull !== false && v3.dot(n, v3.sub(cam.eye, c)) <= 0) return;
  const b = Math.max(0, Math.min(1, o.light ? o.light(n, c) : 0.5));
  const path = (cx) => { cx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < 4; i++) cx.lineTo(P[i][0], P[i][1]); cx.closePath(); };
  ctx.beginPath(); path(ctx); ctx.fillStyle = o.fill ?? "#050505"; ctx.fill();
  // hatch lines run along the face's u axis, spaced along v, projected through the camera
  const lines = o.lines ?? Math.round(8 + 60 * b);
  if (b > 0.02 && lines > 0) {
    ctx.save();
    ctx.beginPath(); path(ctx); ctx.clip();
    ctx.strokeStyle = o.color ?? INK;
    ctx.lineCap = "round";
    const seed = o.seed ?? 1;
    let s = seed * 9301 + 49297;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const dir = o.dir ?? "u";
    for (let i = 0; i < lines; i++) {
      if (rnd() > Math.min(1, 0.25 + b * 1.1)) continue;
      const t = (i + 0.5 + (rnd() - 0.5) * 0.5) / lines;
      const a0 = rnd() * 0.25 * (1 - b), a1 = 1 - rnd() * 0.25 * (1 - b);
      const A = dir === "u" ? edgeLerp(q, a0, t) : edgeLerp(q, t, a0);
      const B = dir === "u" ? edgeLerp(q, a1, t) : edgeLerp(q, t, a1);
      const pa = cam.project(A), pb = cam.project(B);
      ctx.lineWidth = (o.width ?? 1.4) * (0.5 + b) * (0.7 + rnd() * 0.6);
      ctx.globalAlpha = Math.min(1, 0.35 + b);
      ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
    }
    ctx.restore();
  }
  if (o.edge !== false) {
    ctx.globalAlpha = o.edgeAlpha ?? 0.9;
    for (let i = 0; i < 4; i++) {
      const a = P[i], bb = P[(i + 1) % 4];
      taper(ctx, [[a[0], a[1]], [(a[0] + bb[0]) / 2, (a[1] + bb[1]) / 2], [bb[0], bb[1]]], (u) => (o.edgeW ?? 2) * (0.6 + 0.4 * Math.sin(Math.PI * u)), o.color ?? INK);
    }
    ctx.globalAlpha = 1;
  }
}

// bilinear point on quad at (u,v)
function edgeLerp(q, u, v) {
  const a = v3.lerp(q[0], q[1], u), b = v3.lerp(q[3], q[2], u);
  return v3.lerp(a, b, v);
}

// An axis-aligned box: center, size [w,h,d]. Returns its 6 faces (outward CCW).
export function boxFaces(c, s) {
  const [x, y, z] = c, [w, h, d] = s.map((v) => v / 2);
  const p = (dx, dy, dz) => [x + dx * w, y + dy * h, z + dz * d];
  return [
    { q: [p(-1, -1, 1), p(1, -1, 1), p(1, 1, 1), p(-1, 1, 1)], dir: "v" },   // front (+z)
    { q: [p(1, -1, -1), p(-1, -1, -1), p(-1, 1, -1), p(1, 1, -1)], dir: "v" }, // back (-z)
    { q: [p(1, -1, 1), p(1, -1, -1), p(1, 1, -1), p(1, 1, 1)], dir: "v" },   // right (+x)
    { q: [p(-1, -1, -1), p(-1, -1, 1), p(-1, 1, 1), p(-1, 1, -1)], dir: "v" }, // left (-x)
    { q: [p(-1, 1, 1), p(1, 1, 1), p(1, 1, -1), p(-1, 1, -1)], dir: "u" },   // top (+y)
    { q: [p(-1, -1, -1), p(1, -1, -1), p(1, -1, 1), p(-1, -1, 1)], dir: "u" }, // bottom (-y)
  ];
}

// Painter's algorithm over many boxes: collect faces, sort far-to-near, draw.
export function drawBoxes(ctx, cam, boxes, light) {
  const faces = [];
  for (const b of boxes) for (const f of boxFaces(b.c, b.s)) {
    const cen = v3.mul(f.q.reduce((a, p) => v3.add(a, p), [0, 0, 0]), 0.25);
    faces.push({ ...f, box: b, depth: v3.dot(v3.sub(cen, cam.eye), cam.f) });
  }
  faces.sort((a, b) => b.depth - a.depth);
  for (const f of faces) drawQuad(ctx, cam, f.q, { dir: f.dir, light, seed: f.box.seed ?? 1, ...f.box.style });
}
