// s24 scissors, drawn by code from measured landmarks (frame px): the pivot P, and for each half the blade tip T and
// the finger-hole ellipse (centre, full axes, angle — the hole as it shows, so a loop seen edge-on is thin).
// The half is a blade from P to T (straight cutting edge, curved back, tapering to the point) and a shank from P
// to the ring round the hole. White steel with dark ink edges, a bevel line along each blade, a screw at the pivot.
// Spin frames: `smear` draws faint copies of the pose rotated about P over [a0, a1] (the source's spin blur).
import { gv } from "../../../lib/owlInk.js";

const TAU = Math.PI * 2;
const INKC = "rgb(24,24,24)";

function bladePath(g, P, T, w, side) {
  // local frame: u along P→T, v perpendicular (side picks which way the back curves)
  const dx = T[0] - P[0], dy = T[1] - P[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, vx = -uy * side, vy = ux * side;
  const at = (u, v) => [P[0] + ux * u + vx * v, P[1] + uy * u + vy * v];
  const pts = [at(-w * 0.9, -w * 0.15), at(-w * 0.2, -w * 0.55), at(L * 0.18, -w * 0.62), at(L * 0.55, -w * 0.46), at(L * 0.86, -w * 0.2), at(L, 0),
    at(L * 0.7, w * 0.08), at(L * 0.35, w * 0.14), at(0, w * 0.18), at(-w * 0.7, w * 0.2)];
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  }
  g.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  g.closePath();
  return { at, L };
}

function ringPath(g, e, grow) {
  g.ellipse(e[0], e[1], Math.max(0.5, e[2] / 2 + grow), Math.max(0.5, e[3] / 2 + grow), e[4] * Math.PI / 180, 0, TAU);
}

// one half: blade + shank + ring
function half(g, P, h, o) {
  const { w = 20, ring = 9, v = 0.93, ink = 2.0, side = 1, bw = w } = o;
  const E = h.hole;
  // shank from the pivot to the ring's near side (a tapered strap)
  const dx = E[0] - P[0], dy = E[1] - P[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  const sw = w * 0.42 * (h.shank ?? 1);
  // the strap ends on the ring (the ellipse's radius toward the pivot)
  const th = Math.atan2(-uy, -ux) - E[4] * Math.PI / 180, A = E[2] / 2, Bq = E[3] / 2;
  const rr = 1 / Math.sqrt((Math.cos(th) / A) ** 2 + (Math.sin(th) / Bq) ** 2);
  const end = [E[0] - ux * (rr + ring * 0.5), E[1] - uy * (rr + ring * 0.5)];
  const strap = (gg) => {
    gg.moveTo(P[0] - uy * sw, P[1] + ux * sw); gg.lineTo(end[0] - uy * sw * 0.8, end[1] + ux * sw * 0.8);
    gg.lineTo(end[0] + uy * sw * 0.8, end[1] - ux * sw * 0.8); gg.lineTo(P[0] + uy * sw, P[1] - ux * sw); gg.closePath();
  };
  // ink under-layer (outline) then fill; the hole stays open (the lines show through it)
  g.fillStyle = INKC;
  g.beginPath(); strap(g); g.fill();
  g.beginPath(); ringPath(g, E, ring + ink); ringPath(g, E, -ink); g.fill("evenodd");
  g.beginPath(); bladePath(g, P, h.T, bw + ink * 2, side); g.fill();
  g.fillStyle = gv(v);
  g.beginPath(); strap(g); g.fill();
  g.beginPath(); ringPath(g, E, ring); ringPath(g, E, 0); g.fill("evenodd");
  g.fillStyle = gv(v);
  const B = (g.beginPath(), bladePath(g, P, h.T, bw, side)); g.fill();
  // shading: the back half of the blade a little greyer, bevel line along the cutting edge
  g.save(); g.beginPath(); bladePath(g, P, h.T, bw, side); g.clip();
  g.fillStyle = gv(v * 0.8, 0.55);
  g.beginPath(); const q0 = B.at(-bw, -bw), q1 = B.at(B.L, -bw * 0.12), q2 = B.at(B.L * 0.5, -bw * 0.25), q3 = B.at(-bw, -bw * 0.3);
  g.moveTo(q0[0], q0[1]); g.lineTo(q1[0], q1[1]); g.lineTo(q2[0], q2[1]); g.lineTo(q3[0], q3[1]); g.closePath(); g.fill();
  g.restore();
  g.strokeStyle = gv(0.25, 0.8); g.lineWidth = 1.1; g.lineCap = "round";
  const b0 = B.at(w * 0.8, -bw * 0.12), b1 = B.at(B.L * 0.85, -bw * 0.05);
  g.beginPath(); g.moveTo(b0[0], b0[1]); g.lineTo(b1[0], b1[1]); g.stroke();
  // ring bevel: a thin line inside the ring
  g.strokeStyle = gv(0.3, 0.7); g.lineWidth = 1.0;
  g.beginPath(); ringPath(g, E, ring * 0.45); g.stroke();
}

// draw a pair. S = { P, h: [half0, half1], w, ring, v, top (index drawn last), S|smear: [a0, a1, n, alpha],
//   Gh: [[rotation°, alpha], ...] ghost copies, G: [[x, y, reach], ...] glints }
export function drawScissors(g, S) {
  const draw = (gg) => {
    const order = S.top === 0 ? [1, 0] : [0, 1];
    for (const i of order) half(gg, S.P, S.h[i], { w: S.w ?? 20, bw: S.bw ?? S.w ?? 20, ring: S.ring ?? 9, v: S.v ?? 0.93, side: i === 0 ? 1 : -1 });
    // pivot screw
    gg.fillStyle = INKC; gg.beginPath(); gg.arc(S.P[0], S.P[1], (S.w ?? 20) * 0.36, 0, TAU); gg.fill();
    gg.fillStyle = gv(0.9); gg.beginPath(); gg.arc(S.P[0], S.P[1], (S.w ?? 20) * 0.27, 0, TAU); gg.fill();
    gg.strokeStyle = INKC; gg.lineWidth = 1; gg.beginPath(); gg.arc(S.P[0], S.P[1], (S.w ?? 20) * 0.1, 0, TAU); gg.stroke();
  };
  // fix pass 2: the source's spin frames show one pose with a short directional blur, not a fan of copies — ghosts
  // are capped at alpha 0.3, the smear at 3 faint copies within ±12° of the pose (alpha ≤ 0.25)
  if (S.Gh) for (const [ang, alpha] of S.Gh) {
    g.save(); g.globalAlpha = Math.min(0.3, alpha);
    g.translate(S.P[0], S.P[1]); g.rotate(ang * Math.PI / 180); g.translate(-S.P[0], -S.P[1]);
    draw(g); g.restore();
  }
  const sm = S.smear || S.S;
  if (sm) {
    const [a0, a1, n, alpha] = sm, amp = Math.min(12, Math.max(Math.abs(a0), Math.abs(a1))), al = Math.min(0.25, alpha);
    const copies = n >= 3 ? [[-amp, al], [amp, al * 0.8], [-amp * 0.5, al * 0.7]] : [[-amp, al], [amp, al]];
    for (const [ad, aa] of copies) {
      g.save(); g.globalAlpha = aa;
      g.translate(S.P[0], S.P[1]); g.rotate(ad * Math.PI / 180); g.translate(-S.P[0], -S.P[1]);
      draw(g); g.restore();
    }
  }
  if (!S.ghostOnly) draw(g);
  if (S.cut) {
    // punch the finger holes through the layer (what is behind shows through them)
    g.save(); g.globalCompositeOperation = "destination-out";
    for (const h of S.h) { g.beginPath(); ringPath(g, h.hole, -0.5); g.fill(); }
    g.restore();
  }
  // spin streaks: 3–5 thin white arcs at each blade tip, tangent to the rotation (trailing the spin, which runs
  // clockwise on screen), 20–40° long
  if (sm) spinStreaks(g, S);
  if (S.G) for (const [x, y, r] of S.G) glint(g, x, y, r, 0);
}
function spinStreaks(g, S) {
  let sd = Math.abs(Math.round(S.P[0] * 13 + S.P[1] * 7)) % 997;
  const rnd = () => { sd = (sd * 16807 + 11) % 2147483647; return (sd % 10000) / 10000; };
  g.save(); g.lineCap = "round";
  for (const h of S.h) {
    const dx = h.T[0] - S.P[0], dy = h.T[1] - S.P[1], R = Math.hypot(dx, dy), A = Math.atan2(dy, dx), m = 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < m; i++) {
      const r = R * (0.72 + 0.28 * rnd()), span = (20 + 20 * rnd()) * Math.PI / 180, a1 = A - 0.03 - 0.05 * rnd();
      g.strokeStyle = gv(0.92, 0.35 + 0.3 * rnd()); g.lineWidth = 1 + rnd();
      g.beginPath(); g.arc(S.P[0], S.P[1], r, a1 - span, a1); g.stroke();
    }
  }
  g.restore();
}

// four-point glint star: centre, reach (px), rotation
export function glint(g, x, y, r, rot = 0, v = 0.98) {
  g.save(); g.translate(x, y); g.rotate(rot);
  const w = r * 0.16;
  g.fillStyle = INKC;
  const star = (R, Wd) => { g.beginPath(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; g.lineTo(Math.cos(a) * R, Math.sin(a) * R); const b = a + Math.PI / 4; g.lineTo(Math.cos(b) * Wd, Math.sin(b) * Wd); } g.closePath(); };
  star(r + 2.5, w + 2); g.fill();
  g.fillStyle = gv(v); star(r, w); g.fill();
  g.restore();
}
