// s26 — the colour owl (cream, warm-grey cap and wings, orange headphones, peach bandage, amber eyes).
// A small parametric rig in owl units: (0,0) = the midpoint between the eyes, y down, eye spacing = 50 units.
// Measured on the source at 117.3 s (s = 0.92 px/unit): head top 50 above the eyes, chin 43 below, cups at ±60,
// band 61 above, iris r ≈ 10–11. In flight (114.5 s, s ≈ 2.2) the body hangs below-left of the head, rx ≈ 70, ry ≈ 76.
// Everything is deterministic; the owl is drawn straight into the frame (≈ 3–8 ms).
import { rng } from "../../lib/rng.js";

export const OC = {
  line: "#3b261f", lineSoft: "rgba(59,38,31,0.55)",
  cream: "#f0dfc0", creamL: "#f6ead4", creamSh: "#e4c79c", creamWarm: "#dca878",
  cap: "#b3a399", capL: "#c9bbb0", capD: "#8e7e76",
  wing: "#a39088", wingL: "#c2b3aa", wingD: "#7d6b65", covert: "#b8a8a0",
  orange: "#e39a36", orangeD: "#b8661f", orangeL: "#f6c46a", cushion: "#2a2324", band: "#262022", bandL: "#5a5254",
  iris: "#8a5530", irisL: "#c58d4e", pupil: "#26140d", beak: "#eea948", beakD: "#c77a2a",
  plaster: "#e9b894", plasterD: "#cf9670", foot: "#eaa543", footD: "#c07a26", claw: "#4a3228",
};
const TAU = Math.PI * 2;
const lerp = (a, b, u) => a + (b - a) * u;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

let LW = 2; // ink width in units (set per draw from the scale)
function path(g, pts, closed = true) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  if (closed) g.closePath();
}
// Catmull-Rom smooth closed/open path
function spath(g, pts, closed = true) {
  const n = pts.length;
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  const N = closed ? n : n - 1;
  for (let i = 0; i < N; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const a0 = closed || i > 0 ? p0 : p1, a3 = closed || i < n - 2 ? p3 : p2;
    g.bezierCurveTo(p1[0] + (p2[0] - a0[0]) / 6, p1[1] + (p2[1] - a0[1]) / 6, p2[0] - (a3[0] - p1[0]) / 6, p2[1] - (a3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed) g.closePath();
}
function inkStroke(g, w = 1) { g.lineWidth = LW * w; g.strokeStyle = OC.line; g.lineJoin = "round"; g.lineCap = "round"; g.stroke(); }
const rotv = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const nrm = ([x, y]) => { const L = Math.hypot(x, y) || 1; return [x / L, y / L]; };

// ---------------------------------------------------------------- feathers and wings
function feather(g, root, dir, L, w, fill, seed) {
  const d = nrm(dir), p = [-d[1], d[0]];
  const tip = add(root, d, L);
  const a = add(root, p, w * 0.5), b = add(root, p, -w * 0.5);
  const m1 = add(add(root, d, L * 0.62), p, w * 0.55), m2 = add(add(root, d, L * 0.62), p, -w * 0.5);
  g.beginPath();
  g.moveTo(a[0], a[1]);
  g.quadraticCurveTo(m1[0], m1[1], tip[0], tip[1]);
  g.quadraticCurveTo(m2[0], m2[1], b[0], b[1]);
  g.closePath();
  g.fillStyle = fill; g.fill();
  inkStroke(g, 0.55);
  // shaft + a darker vane on one side
  g.beginPath(); const s0 = add(root, d, L * 0.1), s1 = add(root, d, L * 0.8); g.moveTo(s0[0], s0[1]); g.lineTo(s1[0], s1[1]);
  g.lineWidth = LW * 0.35; g.strokeStyle = "rgba(240,230,222,0.55)"; g.stroke();
}
// A spread wing. side k = -1 (viewer's left) / +1. S shoulder, a = elevation (radians, + up) of the leading edge,
// span = length, fan 0..1 = how far the feathers open from the leading edge toward the trailing direction.
function spreadWing(g, W, k) {
  let { S, a, span, fan = 1, droop = 0.2, sec = 1 } = W;
  if (W.tip) {
    // wing given by its outermost tip (units): the primaries reach ~1.15 span past the shoulder
    const dx = W.tip[0] - S[0], dy = W.tip[1] - S[1];
    span = Math.max(40, Math.hypot(dx, dy) / 1.15);
    a = Math.atan2(-dy, k * dx) + k * 0.0;
    droop = 0.0;
  }
  const u = [k * Math.cos(a), -Math.sin(a)];
  const ut = rotv(u, k * droop);                        // the hand bends back toward the tip
  const trail = [-k * u[1], k * u[0]];                    // perpendicular, toward the trailing edge
  const Wr = add(S, u, span * 0.4), T = add(Wr, ut, span * 0.6);
  const n1 = 7, n2 = 6;
  const angT = Math.atan2(ut[1], ut[0]), angN = Math.atan2(trail[1], trail[0]);
  let dA = angN - angT; while (dA > Math.PI) dA -= TAU; while (dA < -Math.PI) dA += TAU;
  // secondaries (arm), inner first
  for (let i = n2 - 1; i >= 0; i--) {
    const q = (i + 0.5) / n2, root = [lerp(S[0], Wr[0], q), lerp(S[1], Wr[1], q)];
    const d = rotv(trail, -k * (0.25 - 0.2 * q) * fan);
    feather(g, root, d, span * (0.2 + 0.05 * q) * sec, span * 0.12, i % 2 ? OC.wing : OC.wingL, i);
  }
  // primaries (hand), inner first so the outer ones lie on top
  for (let i = n1 - 1; i >= 0; i--) {
    const q = i / (n1 - 1);                               // 0 = tip feather
    const root = [lerp(T[0], Wr[0], q * 0.92), lerp(T[1], Wr[1], q * 0.92)];
    const ang = angT + dA * (0.12 + 0.88 * q) * (0.45 + 0.55 * fan);
    const L = span * (0.44 - 0.08 * q);
    feather(g, add(root, ut, -L * 0.45), [Math.cos(ang), Math.sin(ang)], L, span * 0.12, i % 2 ? OC.wing : OC.wingD, 10 + i);
  }
  // coverts: a band along the leading edge with a scalloped trailing edge
  const edge = [S, add(S, u, span * 0.2), Wr, add(Wr, ut, span * 0.3), add(T, ut, -span * 0.05)];
  const inner = [];
  for (let i = edge.length - 1; i >= 0; i--) {
    const q = i / (edge.length - 1), off = span * (0.2 - 0.14 * q);
    inner.push(add(edge[i], trail, off));
  }
  const band = [...edge, ...inner];
  spath(g, band, true);
  g.fillStyle = OC.covert; g.fill(); inkStroke(g, 0.7);
  // covert scallops
  g.lineWidth = LW * 0.45; g.strokeStyle = OC.lineSoft;
  for (let i = 0; i < 6; i++) {
    const q = (i + 0.5) / 6, e = i < 3 ? [lerp(S[0], Wr[0], q * 2), lerp(S[1], Wr[1], q * 2)] : [lerp(Wr[0], T[0], (q - 0.5) * 1.6), lerp(Wr[1], T[1], (q - 0.5) * 1.6)];
    const c = add(e, trail, span * (0.15 - 0.1 * q));
    g.beginPath(); g.arc(c[0], c[1], span * 0.035, 0, Math.PI); g.stroke();
  }
  // the lit leading edge
  spath(g, edge, false); g.lineWidth = LW * 1.5; g.strokeStyle = OC.wingL; g.stroke();
  spath(g, edge, false); inkStroke(g, 0.9);
  return { T, Wr };
}
// a wing folded against the body side (perched): a feathered leaf from the shoulder down past the belly
function foldedWing(g, W, k) {
  const { S, T, width = 26 } = W;
  const d = nrm([T[0] - S[0], T[1] - S[1]]), p = [k * -d[1] * -1, k * d[0] * -1];
  // outward normal: away from the body centre
  const out = [k * Math.abs(d[1]), -d[0] * k * 0.2];
  const pts = [S, add(add(S, d, 0.35 * Math.hypot(T[0] - S[0], T[1] - S[1])), out, width), add(T, out, width * 0.25), T,
    add(add(T, d, -0.3 * Math.hypot(T[0] - S[0], T[1] - S[1])), out, -width * 0.25)];
  spath(g, pts, true);
  g.fillStyle = OC.wing; g.fill(); inkStroke(g, 0.8);
  // primaries at the bottom
  g.lineWidth = LW * 0.5; g.strokeStyle = OC.lineSoft;
  for (let i = 0; i < 3; i++) {
    const q = 0.55 + i * 0.13, a = [lerp(S[0], T[0], q), lerp(S[1], T[1], q)];
    const b = add(add(a, out, width * (0.8 - i * 0.15)), d, 6);
    g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(a[0] + out[0] * width * 0.5, a[1] + 8, b[0], b[1]); g.stroke();
  }
  // lighter coverts at the top
  const c = [S, add(add(S, d, 12), out, width * 0.9), add(add(S, d, 30), out, width * 0.4), add(S, d, 26)];
  spath(g, c, true); g.fillStyle = OC.covert; g.fill();
}

// ---------------------------------------------------------------- eyes
// state: open | angry | half | sleepy | closed (happy ∩ arcs) | shut (flat lid line, a squint)
function eye(g, x, y, r, sx, k, state, look) {
  g.save();
  g.translate(x, y);
  if (state === "closed" || state === "shut") {
    g.beginPath();
    if (state === "closed") { g.moveTo(-r * 0.95 * sx, r * 0.25); g.quadraticCurveTo(0, -r * 0.75, r * 0.95 * sx, r * 0.25); }
    else { g.moveTo(-r * sx, -r * 0.05 + k * r * 0.12); g.quadraticCurveTo(0, r * 0.3, r * sx, -r * 0.05 - k * r * 0.12); }
    inkStroke(g, 1.25);
    // a short lash at the outer corner
    g.beginPath(); g.moveTo(k * r * 0.9 * sx, r * 0.1); g.lineTo(k * r * 1.2 * sx, -r * 0.05); inkStroke(g, 0.7);
    g.restore();
    return;
  }
  // a pale ring round the iris, then the iris
  g.save(); g.scale(sx, 1);
  g.beginPath(); g.arc(0, 0, r * 1.18, 0, TAU); g.fillStyle = OC.creamL; g.fill();
  g.beginPath(); g.arc(0, 0, r, 0, TAU);
  const gr = g.createRadialGradient(0, r * 0.25, r * 0.2, 0, 0, r);
  gr.addColorStop(0, OC.irisL); gr.addColorStop(0.55, "#a86c38"); gr.addColorStop(1, OC.iris);
  g.fillStyle = gr; g.fill();
  const px = look[0] * r * 0.28, py = look[1] * r * 0.28;
  g.beginPath(); g.arc(px, py, r * 0.56, 0, TAU); g.fillStyle = OC.pupil; g.fill();
  g.beginPath(); g.arc(px + r * 0.26, py - r * 0.3, r * 0.26, 0, TAU); g.fillStyle = "#fffaf0"; g.fill();
  g.beginPath(); g.arc(px - r * 0.24, py + r * 0.28, r * 0.1, 0, TAU); g.fill();
  g.beginPath(); g.arc(0, 0, r, 0, TAU); inkStroke(g, 1.0);
  // lids
  let lid = 0, slant = 0, low = 0;
  if (state === "angry") { lid = 0.52; slant = 0.55; low = 0.18; }
  else if (state === "half") { lid = 0.45; slant = 0.05; low = 0.1; }
  else if (state === "sleepy") { lid = 0.62; slant = -0.1; low = 0.12; }
  if (lid > 0) {
    g.save();
    g.beginPath(); g.arc(0, 0, r * 1.22, 0, TAU); g.clip();
    // upper lid: edge y(x) = ey - k*slant*x (lower toward the inner corner, by the beak)
    const ey = -r + 2 * r * lid, yl = (x) => ey - k * slant * x;
    g.beginPath();
    g.moveTo(-r * 1.4, -r * 1.4); g.lineTo(r * 1.4, -r * 1.4); g.lineTo(r * 1.4, yl(r * 1.4)); g.lineTo(-r * 1.4, yl(-r * 1.4));
    g.closePath(); g.fillStyle = OC.cream; g.fill();
    g.beginPath(); g.moveTo(-r * 1.15, yl(-r * 1.15)); g.lineTo(r * 1.15, yl(r * 1.15));
    inkStroke(g, 1.3);
    if (low > 0) {
      g.beginPath(); g.moveTo(-r * 1.4, r * 1.4); g.lineTo(r * 1.4, r * 1.4); g.lineTo(r * 1.4, r * (1 - 2 * low)); g.lineTo(-r * 1.4, r * (1 - 2 * low)); g.closePath();
      g.fillStyle = OC.cream; g.fill();
      g.beginPath(); g.moveTo(-r * 0.9, r * (1 - 2 * low)); g.quadraticCurveTo(0, r * (1 - 2 * low) + r * 0.08, r * 0.9, r * (1 - 2 * low)); inkStroke(g, 0.6);
    }
    g.restore();
  }
  g.restore();
  g.restore();
}

// ---------------------------------------------------------------- the whole owl
// pose (owl units, see top):
//   x, y  frame px of the eye midpoint; s px/unit; rot whole-bird roll (radians, about the eye midpoint)
//   turn  -1..1: + turns the face toward the viewer's right (features shift right, left cup shows its face)
//   body  { x, y, rx, ry, rot }   eyes { L, R, look }   feet { mode: "dangle"|"perch", L:[x,y], R:[x,y], rot }
//   wings [left, right]: { type: "spread", S, a, span, fan, droop, front } | { type: "folded", S, T, width, front }
export function drawColorOwl(ctx, P) {
  const s = P.s, g = ctx;
  LW = clamp(1.9 / Math.max(0.5, s * 0.85) * Math.min(1.6, 0.9 + s * 0.35), 1.6, 3.2);
  const turn = P.turn ?? 0, fx = turn * 16, HS = P.hs ?? 1.18; // HS: head size vs the eye spacing (measured 117.3 / 115.08)
  const B = { x: 0, y: 105, rx: 58, ry: 68, rot: 0, ...(P.body || {}) };
  const E = { L: "open", R: "open", look: [0, 0], ...(P.eyes || {}) };
  g.save();
  g.translate(P.x, P.y); g.rotate(P.rot ?? 0); g.scale(s, s);
  g.translate(-fx, 0); // (x, y) is the midpoint between the eyes, which sit fx off the head centre when it turns
  g.lineJoin = "round"; g.lineCap = "round";
  const wings = P.wings || [];
  const drawWing = (w, k) => (w.type === "folded" ? foldedWing(g, w, k) : spreadWing(g, w, k));
  // cups: azimuth on the head (0 = front); the far cup is drawn behind the head
  const cupAz = [-Math.PI / 2 + turn * 0.9, Math.PI / 2 + turn * 0.9];
  const cup = (k) => {
    const az = cupAz[k < 0 ? 0 : 1];
    return { x: Math.sin(az) * 58 * HS + (k < 0 ? -2 : 2), y: P.cupY ?? 2, z: Math.cos(az), face: clamp(Math.abs(Math.cos(az)) * 1.2 + 0.25, 0.3, 1) };
  };
  const drawCup = (k) => {
    const c = cup(k), fw = (15 * c.face + 7) * 1.1, h = 29;
    g.save(); g.translate(c.x, c.y);
    // yoke to the band
    g.beginPath(); g.moveTo(0, -h * 0.9); g.lineTo(-k * 3, -h - 8); g.lineWidth = 6; g.strokeStyle = OC.band; g.stroke();
    // cushion (toward the head)
    g.beginPath(); g.ellipse(-k * 5, 0, fw * 0.7, h * 0.95, 0, 0, TAU); g.fillStyle = OC.cushion; g.fill(); inkStroke(g, 0.7);
    // shell
    g.beginPath(); g.ellipse(k * 3, 0, fw, h, 0, 0, TAU);
    const gr = g.createLinearGradient(-fw, -h, fw, h); gr.addColorStop(0, OC.orangeL); gr.addColorStop(0.45, OC.orange); gr.addColorStop(1, OC.orangeD);
    g.fillStyle = gr; g.fill(); inkStroke(g, 0.9);
    g.beginPath(); g.ellipse(k * 3 + k * fw * 0.25, 0, fw * 0.55, h * 0.62, 0, 0, TAU); g.lineWidth = LW * 0.6; g.strokeStyle = "rgba(120,60,20,0.6)"; g.stroke();
    g.beginPath(); g.ellipse(k * 3 - k * fw * 0.35, -h * 0.25, fw * 0.18, h * 0.35, 0, 0, TAU); g.fillStyle = "rgba(255,236,190,0.7)"; g.fill();
    g.restore();
  };
  // --- behind: back wings, tail
  wings.forEach((w, i) => { if (!w.front) drawWing(w, i ? 1 : -1); });
  if (P.tail != null) {
    const ta = P.tail, bx0 = B.x + Math.cos(ta) * B.rx * 0.75, by0 = B.y + Math.sin(ta) * B.ry * 0.75;
    for (const [da, L] of [[-0.35, 46], [0, 56], [0.35, 44]]) {
      const d = [Math.cos(ta + da), Math.sin(ta + da)];
      feather(g, [bx0, by0], d, L, 22, "#efc98f", 0);
    }
  }
  // --- body
  g.save(); g.translate(B.x, B.y); g.rotate(B.rot);
  // fluffy outline: the lower half breaks into small feather points
  const bodyPath = () => {
    g.beginPath();
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * TAU, lo = Math.max(0, Math.sin(a));
      const saw = Math.abs(((i * 0.5) % 2) - 1);
      const k = 1 + 0.07 * lo * (1 - saw);
      const px = Math.cos(a) * B.rx * k, py = Math.sin(a) * B.ry * k;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
  };
  bodyPath();
  const bg = g.createRadialGradient(-B.rx * 0.2, -B.ry * 0.25, B.rx * 0.2, 0, 0, Math.max(B.rx, B.ry) * 1.05);
  bg.addColorStop(0, OC.creamL); bg.addColorStop(0.6, OC.cream); bg.addColorStop(0.9, OC.creamSh); bg.addColorStop(1, OC.creamWarm);
  g.fillStyle = bg; g.fill();
  g.lineJoin = "miter";
  // warm shade toward the lower left (the page's warm light and the tail side)
  const wg = g.createLinearGradient(B.rx * 0.4, -B.ry * 0.7, -B.rx * 0.9, B.ry * 0.9);
  wg.addColorStop(0, "rgba(232,170,100,0)"); wg.addColorStop(0.55, "rgba(232,170,100,0.12)"); wg.addColorStop(1, "rgba(226,150,80,0.62)");
  g.fillStyle = wg; g.fill();
  inkStroke(g, 1);
  // chest feather ticks
  const r = rng(77);
  g.lineWidth = LW * 0.45; g.strokeStyle = "rgba(150,105,70,0.5)";
  for (let i = 0; i < 16; i++) {
    const u = r() * 2 - 1, v = r() * 1.6 - 0.6;
    if (u * u + v * v > 0.7) continue;
    const cx = u * B.rx * 0.8, cy = v * B.ry * 0.7, w = B.rx * 0.09;
    g.beginPath(); g.moveTo(cx - w, cy - w * 0.4); g.quadraticCurveTo(cx, cy + w * 0.6, cx + w, cy - w * 0.4); g.stroke();
  }
  g.restore();
  // --- feet
  const F = P.feet || { mode: "dangle" };
  const drawFoot = (p, k) => {
    g.save(); g.translate(p[0], p[1]); g.rotate((F.rot ?? 0) + (F.mode === "perch" ? 0 : k * 0.1));
    // feathered leg
    g.beginPath(); g.ellipse(0, -8, 9, 12, 0, 0, TAU); g.fillStyle = OC.cream; g.fill();
    for (let j = -1; j <= 1; j++) {
      const L = F.mode === "perch" ? 12 : 17, a = j * (F.mode === "perch" ? 0.45 : 0.35);
      const d = [Math.sin(a), Math.cos(a)];
      const e = add([j * 4, 0], d, L);
      g.beginPath(); g.moveTo(j * 4, -2); g.lineTo(e[0], e[1]);
      g.lineWidth = 6.5; g.strokeStyle = OC.line; g.stroke();
      g.lineWidth = 4.2; g.strokeStyle = OC.foot; g.stroke();
      // claw
      const c = add(e, d, 4);
      g.beginPath(); g.moveTo(e[0] - d[1] * 2, e[1] + d[0] * 2); g.lineTo(c[0] - d[1] * 0.5 * k, c[1] + 1); g.lineTo(e[0] + d[1] * 2, e[1] - d[0] * 2); g.closePath();
      g.fillStyle = OC.claw; g.fill();
    }
    g.restore();
  };
  if (F.L) drawFoot(F.L, -1);
  if (F.R) drawFoot(F.R, 1);
  // --- head group (cups, band, head) tilts with headRot about the eye midpoint
  g.save(); g.rotate(P.headRot ?? 0);
  // --- far cup behind the head
  const cups = [-1, 1].map((k) => ({ k, c: cup(k) }));
  cups.forEach(({ k, c }) => { if (c.z < -0.05) drawCup(k); });
  // --- band (behind the tufts, over the head top)
  const cl = cup(-1), cr = cup(1);
  g.beginPath(); g.moveTo(cl.x, cl.y - 22); g.bezierCurveTo(cl.x - 4, -78 * HS, cr.x + 4, -78 * HS, cr.x, cr.y - 22);
  g.lineWidth = 11; g.strokeStyle = OC.line; g.stroke();
  g.lineWidth = 7.5; g.strokeStyle = OC.band; g.stroke();
  g.beginPath(); g.moveTo(cl.x + 6, cl.y - 32); g.bezierCurveTo(cl.x + 2, -74 * HS, cr.x - 2, -74 * HS, cr.x - 6, cr.y - 32);
  g.lineWidth = 1.6; g.strokeStyle = OC.bandL; g.stroke();
  // --- head
  g.save();
  const head = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * TAU, c = Math.cos(a), sn = Math.sin(a);
    // superellipse-ish: flatter top, fuller cheeks
    const e = sn < 0 ? 2.6 : 2.2;
    const rx = 52 * HS, ry = (sn < 0 ? 50 : 42) * HS;
    const px = Math.sign(c) * Math.pow(Math.abs(c), 2 / e) * rx, py = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / e) * ry;
    head.push([px + fx * 0.25, py - 3]);
  }
  // ear tufts
  const tuft = (k) => {
    const bx = k * 34 + fx * 0.3;
    return [[(bx - k * 14) * HS, -44 * HS], [(bx + k * 12) * HS, -64 * HS], [(bx + k * 16) * HS, -40 * HS]];
  };
  for (const k of [-1, 1]) { path(g, tuft(k)); g.fillStyle = OC.cap; g.fill(); inkStroke(g, 0.8); }
  spath(g, head, true);
  g.fillStyle = OC.cap; g.fill();
  // face mask: cream heart round the eyes and down to the chin
  g.save(); spath(g, head, true); g.clip();
  const esp = P.eyeSp ?? 25, eyeX = [-esp + fx, esp + fx];
  g.beginPath();
  g.ellipse(eyeX[0] - 3, 5, 30, 33, 0, 0, TAU);
  g.ellipse(eyeX[1] + 3, 5, 30, 33, 0, 0, TAU);
  g.fillStyle = OC.cream; g.fill();
  g.beginPath(); g.ellipse(fx * 0.9, 30 * HS, 48 * HS, 26 * HS, 0, 0, TAU); g.fill();
  // soft cap shading at the top
  const cg = g.createLinearGradient(0, -52 * HS, 0, -20 * HS); cg.addColorStop(0, "rgba(120,104,96,0.35)"); cg.addColorStop(1, "rgba(120,104,96,0)");
  g.fillStyle = cg; g.fillRect(-90, -70 * HS, 180, 50 * HS);
  // the V where the cap meets the mask between the eyes
  g.beginPath(); g.moveTo(fx - 12, -22); g.lineTo(fx, -8); g.lineTo(fx + 12, -22); g.lineWidth = LW * 0.6; g.strokeStyle = OC.lineSoft; g.stroke();
  // mask edge lines
  g.beginPath(); g.ellipse(eyeX[0] - 3, 5, 30, 33, 0, Math.PI * 1.05, Math.PI * 1.75); g.lineWidth = LW * 0.55; g.strokeStyle = OC.lineSoft; g.stroke();
  g.beginPath(); g.ellipse(eyeX[1] + 3, 5, 30, 33, 0, Math.PI * 1.25, Math.PI * 1.95); g.stroke();
  // cheek fluff ticks
  g.strokeStyle = "rgba(150,110,80,0.45)"; g.lineWidth = LW * 0.4;
  for (const k of [-1, 1]) for (let i = 0; i < 3; i++) {
    const cx = fx + k * (30 + i * 6) * HS, cy = (30 + i * 4) * HS;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + k * 4, cy + 5); g.stroke();
  }
  g.restore();
  spath(g, head, true); inkStroke(g, 1.1);
  // bandage on the owl's right brow (viewer's left, up on the cap)
  g.save(); g.translate(-17 * HS + fx * 1.25, -38 * HS); g.rotate(-0.35); g.scale(1.1, 1.1);
  for (const rr of [0.55, -0.55]) {
    g.save(); g.rotate(rr);
    g.beginPath(); g.roundRect(-15, -4.5, 30, 9, 4.5); g.fillStyle = OC.plaster; g.fill(); inkStroke(g, 0.55);
    g.fillStyle = OC.plasterD; g.fillRect(-4, -3, 8, 6);
    g.restore();
  }
  g.restore();
  // eyes
  const sxL = 1 - 0.3 * Math.max(0, -turn), sxR = 1 - 0.3 * Math.max(0, turn);
  eye(g, eyeX[0], 0, 11, sxL, -1, E.L, E.look);
  eye(g, eyeX[1], 0, 11, sxR, 1, E.R, E.look);
  // brows for the angry look
  if (E.L === "angry" || E.R === "angry") {
    g.beginPath(); g.moveTo(eyeX[0] - 12, -16); g.quadraticCurveTo(eyeX[0], -17, fx - 5, -9); inkStroke(g, 1.0);
    g.beginPath(); g.moveTo(eyeX[1] + 12, -16); g.quadraticCurveTo(eyeX[1], -17, fx + 5, -9); inkStroke(g, 1.0);
  }
  // beak
  const bx = fx * 1.15;
  g.beginPath(); g.moveTo(bx - 7, 10); g.quadraticCurveTo(bx, 6, bx + 7, 10); g.quadraticCurveTo(bx + 5, 20, bx + 0.5, 28); g.quadraticCurveTo(bx - 4, 20, bx - 7, 10); g.closePath();
  const bgr = g.createLinearGradient(bx - 7, 8, bx + 7, 26); bgr.addColorStop(0, "#f7c46a"); bgr.addColorStop(1, OC.beakD);
  g.fillStyle = bgr; g.fill(); inkStroke(g, 0.8);
  g.restore();
  // --- near cup on top of the head
  cups.forEach(({ k, c }) => { if (c.z >= -0.05) drawCup(k); });
  g.restore();
  // --- front wings
  wings.forEach((w, i) => { if (w.front) drawWing(w, i ? 1 : -1); });
  g.restore();
}

// ---------------------------------------------------------------- the s26 flight (frame px, measured; see fidelity/s26.md)
// eye midpoint + scale (eye spacing / 50) read on fine grids / eye-blob detection of the source.
// [t, x, y, s, eyeSp]: eye midpoint (frame px) read on gridded crops of the source (checked by overlaying the
// predicted eyes on every 2nd frame, snapshots/s26-study/pathcheck.jpg); s from the head + cups width (150 units);
// eyeSp = half the eye spacing in units (the big flying owl is drawn with wider-set eyes than the perched one).
const PATH = [
  [114.0, 1388, 288, 2.15, 30], [114.12, 1390, 288, 2.15, 30], [114.36, 1400, 280, 2.15, 30], [114.6, 1414, 280, 2.15, 28.5],
  [114.76, 1446, 282, 2.15, 23], [114.84, 1459, 277, 2.12, 23], [115.08, 1497, 288, 2.0, 24.5], [115.32, 1556, 283, 1.97, 24.5],
  [115.56, 1622, 250, 1.75, 24], [115.8, 1727, 181, 1.38, 24.5], [116.04, 1843, 96, 1.0, 25], [116.2, 1904, 52, 0.92, 25],
  [116.28, 1922, 38, 0.9, 25], [116.36, 1938, 35, 0.9, 25], [116.52, 1962, 56, 0.92, 25], [116.76, 1997, 88, 0.95, 25],
  [117.0, 2013, 142, 1.0, 25], [117.08, 2017, 156, 1.0, 25], [117.16, 2017, 153, 1.0, 25], [117.24, 2017, 151, 1.0, 25], [117.6, 2017, 151, 1.0, 25],
];
// [t, rot, turn, headRot, cupY]: cupY from the orange cups' centroids vs the eyes (left cup, and both cups where
// visible: at 115.08 the cup line tilts 9 deg -> headRot 0.16)
const ATT = [
  [114.0, 0.04, 0.5, 0.06, -10], [114.6, 0.04, 0.45, 0.06, -10], [114.84, 0.04, 0.28, 0.06, -16], [115.08, 0.06, 0.2, 0.16, -12],
  [115.32, 0.06, 0.15, -0.03, -21], [115.56, 0.08, 0.12, 0.0, -22], [115.8, 0.06, 0.05, 0.0, -15], [116.04, 0.02, 0, 0, -16],
  [116.2, 0, 0, 0, -12], [116.52, 0, 0, 0, -8], [117.0, 0, -0.08, 0, -5], [117.6, 0, -0.08, 0, -5],
];
// wing tips [t, Lx, Ly, Rx, Ry] in units from the eye midpoint: the outermost points of the source's owl silhouette
// (frame minus the clean page at 117.48, every 2nd frame 114.92–117.0; 114.0–114.84 read on gridded crops).
// Down-strokes bottom out at 115.04, 115.56, 115.96, 116.36; the wings fold from 116.84 and it lands at 117.04.
const WINGT = [
  [114.0, -248, -75, 223, 9], [114.84, -255, -40, 215, 35], [114.92, -267, 10, 209, 61], [115.0, -225, 113, 149, 186],
  [115.08, -210, 88, 124, 104], [115.16, -223, -52, 185, 2], [115.24, -198, -90, 164, -32], [115.32, -177, -71, 147, -20],
  [115.4, -199, -47, 169, -5], [115.48, -195, 66, 115, 146], [115.56, -174, 89, 80, 147], [115.64, -172, 45, 98, 92],
  [115.72, -177, -53, 140, -38], [115.8, -177, -57, 180, -31], [115.88, -195, -12, 190, -14], [115.96, -173, 125, 139, 149],
  [116.04, -214, 53, 200, 46], [116.12, -206, -77, 200, -40], [116.2, -222, -27, 226, -38], [116.28, -231, 50, 240, 12],
  [116.36, -222, 81, 240, 68], [116.44, -213, -10, 240, -21], [116.52, -164, -61, 233, -61], [116.6, -149, -69, 211, -69],
  [116.68, -155, -85, 209, -69], [116.76, -166, -61, 219, -64], [116.84, -169, 12, 212, 11], [116.92, -146, 66, 165, 66],
  [117.0, -107, 66, 131, 74],
];
function lin(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  const n = keys.length;
  if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0;
  while (keys[i + 1][0] < t) i++;
  const a = keys[i], b = keys[i + 1], u = (t - a[0]) / (b[0] - a[0]);
  return a.slice(1).map((v, k) => v + (b[k + 1] - v) * u);
}
function interp(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  const n = keys.length;
  if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0;
  while (keys[i + 1][0] < t) i++;
  const a = keys[i], b = keys[i + 1], u = (t - a[0]) / (b[0] - a[0]);
  const e = u * u * (3 - 2 * u);
  return a.slice(1).map((v, k) => v + (b[k + 1] - v) * e);
}
function eyesAt(t) {
  if (t < 114.58) return { L: "angry", R: "angry", look: [-0.5, 0.1] };
  if (t < 114.66) return { L: "closed", R: "shut", look: [0, 0] };
  if (t < 114.74) return { L: "half", R: "half", look: [0, 0] };
  if (t < 115.94) return { L: "open", R: "open", look: [0.1, 0] };
  if (t < 116.1) return { L: "sleepy", R: "sleepy", look: [0, 0.2] };
  if (t < 116.48) return { L: "open", R: "open", look: [0, 0] };
  if (t < 116.96) return { L: "closed", R: "closed", look: [0, 0] };
  if (t < 117.06) return { L: "half", R: "half", look: [0, 0] };
  return { L: "open", R: "open", look: [0, 0.05] };
}
export function colorOwlAt(t) {
  if (t < 114.0) return null;
  const [x, y, s, eyeSp] = interp(PATH, t);
  const [rot, turn, headRot, cupY] = interp(ATT, t);
  const perched = t >= 117.04;
  const pose = { x, y, s, rot, turn, headRot, eyeSp, cupY, eyes: eyesAt(t) };
  if (perched) {
    // 117.3: body x 1955–2080, y 180–250 (wings folded at the sides), toes over the lid at y ≈ 243
    pose.body = { x: 0, y: 64, rx: 50, ry: 38 };
    pose.wings = [{ type: "folded", S: [-44, 40], T: [-50, 92], width: 20 }, { type: "folded", S: [44, 40], T: [50, 92], width: 20 }];
    pose.feet = { mode: "perch", L: [-17, 88], R: [17, 88] };
  } else {
    const [lx, ly, rx, ry] = lin(WINGT, t);
    const big = clamp((s - 0.9) / 1.35);                 // 0 = small frontal flier (s 0.9), 1 = the big 3/4 owl (s 2.2)
    // body / feet / wing roots measured at 114.36, 115.08 (big) and 116.28 (small), in units from the eye midpoint
    pose.body = { x: lerp(6, -32, big), y: lerp(95, 82, big), rx: lerp(53, 72, big), ry: lerp(44, 62, big), rot: lerp(0, 0.25, big) };
    pose.tail = lerp(Math.PI / 2, Math.PI * 0.95, big);
    pose.wings = [
      { type: "spread", S: [lerp(-34, -62, big), lerp(78, 44, big)], tip: [lx, ly], fan: 0.9 },
      { type: "spread", S: [lerp(34, 30, big), lerp(78, 52, big)], tip: [rx, ry], fan: 0.9 },
    ];
    pose.feet = { mode: "dangle", L: [lerp(-12, -108, big), lerp(146, 146, big)], R: [lerp(22, -80, big), lerp(150, 176, big)], rot: lerp(0, 0.35, big) };
  }
  return pose;
}
export const COLOR_OWL_KEYS = { PATH, ATT, WINGT };
