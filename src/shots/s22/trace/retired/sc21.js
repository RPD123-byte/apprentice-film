// s22's copy of src/shots/s21/scissors.js (owned by the s21 agent; copied 2026-09-25T15:26), so that s22 draws the same bird as
// s21 across the 74.52 cut without depending on another shot's module. s22 changes are marked "(s22)".
// s21's scissors (frame px), drawn to the source's structure (measured on 73.40–74.48, where they are seen
// side-on and large): two long pointed blades that run on a little past the pivot screw to a heel; from the heel
// each handle's shank curves out to its finger ring (the upper one carries a small flange by the heel); the rings
// are thick loops (~5 px at L = 89) whose holes show the background.
//
// sc = { x, y (the pivot screw), ang (the blades' mean direction, pivot → tips), L (pivot → tip), open (angle between
//        the blades), rings: [r0, r1] }
// A ring r = { u, v, rx, ry, rot, t } in units of L in the scissors' own frame: u along the handles (away from the
// tips), v across (+ = the side e2 = (sin ang, −cos ang), i.e. "up" when the blades point right), rx/ry the loop's
// centre-line semi-axes, rot its tilt relative to the handle direction, t its thickness.
import { gv, LINE, V } from "../../lib/owlInk.js";

export function ringPos(sc, r) {
  const h = [-Math.cos(sc.ang), -Math.sin(sc.ang)], e2 = [-h[1], h[0]];
  return [sc.x + (h[0] * r.u + e2[0] * r.v) * sc.L + (r.dx || 0), sc.y + (h[1] * r.u + e2[1] * r.v) * sc.L + (r.dy || 0)];
}
// the ring centres, upper first
export function ringCentres(sc) { return sc.rings.map((r) => ringPos(sc, r)).sort((p, q) => p[1] - q[1]); }
export function gripPoint(sc) { const [a, b] = ringCentres(sc); return V.mix(a, b, 0.5); }
export function scissorsBox(sc) {
  const pts = [[sc.x, sc.y], [sc.x + Math.cos(sc.ang) * sc.L * 1.02, sc.y + Math.sin(sc.ang) * sc.L * 1.02], ...ringCentres(sc)];
  const m = sc.L * 0.26;
  return [Math.min(...pts.map((p) => p[0])) - m, Math.min(...pts.map((p) => p[1])) - m, Math.max(...pts.map((p) => p[0])) + m, Math.max(...pts.map((p) => p[1])) + m];
}

// one blade from the heel (u < 0) to the tip, k = +1 / −1: which side its cutting edge faces
function drawBlade(g, x, y, a, L, k) {
  const c = Math.cos(a), s = Math.sin(a);
  const P = (u, v) => [x + c * u - s * v, y + s * u + c * v];
  const w0 = 0.072 * L, i = -k;
  // back edge (away from the other blade) straight and full, cutting edge straight, meeting in a sharp point
  const blade = [P(-0.1 * L, -i * w0 * 0.75), P(0.0, -i * w0 * 1.0), P(0.35 * L, -i * w0 * 0.95), P(0.68 * L, -i * w0 * 0.7), P(0.9 * L, -i * w0 * 0.3), P(L, i * w0 * 0.05),
    P(0.8 * L, i * w0 * 0.28), P(0.45 * L, i * w0 * 0.55), P(0.1 * L, i * w0 * 0.72), P(-0.1 * L, i * w0 * 0.6)];
  g.beginPath(); g.moveTo(blade[0][0], blade[0][1]); for (const p of blade.slice(1)) g.lineTo(p[0], p[1]); g.closePath();
  g.fillStyle = gv(0.86); g.fill();
  g.lineWidth = 1.0; g.strokeStyle = gv(0.14, 0.8); g.stroke();
  // the bevel: a bright line along the back, a greyer one along the cutting edge
  g.lineWidth = Math.max(0.8, 0.014 * L); g.strokeStyle = gv(0.97, 0.9);
  g.beginPath(); const h0 = P(-0.02 * L, -i * w0 * 0.55), h1 = P(0.62 * L, -i * w0 * 0.45), h2 = P(0.93 * L, -i * w0 * 0.08); g.moveTo(h0[0], h0[1]); g.quadraticCurveTo(h1[0], h1[1], h2[0], h2[1]); g.stroke();
  g.lineWidth = Math.max(0.6, 0.008 * L); g.strokeStyle = gv(0.45, 0.75);
  g.beginPath(); const e0 = P(0.1 * L, i * w0 * 0.35), e1 = P(0.86 * L, i * w0 * 0.1); g.moveTo(e0[0], e0[1]); g.lineTo(e1[0], e1[1]); g.stroke();
}

// the shank's curve: from the heel behind the screw to the loop's outer point facing it
function shankGeom(sc, r) {
  const L = sc.L, rc = ringPos(sc, r), a = sc.ang + Math.PI, ra = a + (r.rot || 0);
  const rx = r.rx * L, ry = r.ry * L, t = Math.max(2, (r.t ?? 0.056) * L);
  const ax = [Math.cos(sc.ang), Math.sin(sc.ang)], side = Math.sign(r.v || 0.001);
  const e2 = [Math.sin(sc.ang), -Math.cos(sc.ang)];
  const heel = V.add(V.add([sc.x, sc.y], V.mul(ax, -0.1 * L)), V.mul(e2, side * 0.025 * L));
  const d = V.sub(heel, rc), ca = Math.cos(ra), sa = Math.sin(ra);
  const lx = d[0] * ca + d[1] * sa, ly = -d[0] * sa + d[1] * ca;
  const th = Math.atan2(ly / (ry + t / 2), lx / (rx + t / 2));
  const loc = [Math.cos(th) * (rx + t * 0.2), Math.sin(th) * (ry + t * 0.2)];
  const att = [rc[0] + loc[0] * ca - loc[1] * sa, rc[1] + loc[0] * sa + loc[1] * ca];
  const mid = V.add(V.mix(heel, att, 0.5), V.mul(e2, side * 0.03 * L));
  return { heel, mid, att, rc, ra, rx, ry, t, ax, e2, side };
}
// the dark gap between the two shanks (the source draws it as a dark lens between two thin curved bars)
function shankGap(g, sc) {
  const [A, B] = sc.rings.map((r) => shankGeom(sc, r));
  g.beginPath(); g.moveTo(A.heel[0], A.heel[1]); g.quadraticCurveTo(A.mid[0], A.mid[1], A.att[0], A.att[1]);
  g.lineTo(B.att[0], B.att[1]); g.quadraticCurveTo(B.mid[0], B.mid[1], B.heel[0], B.heel[1]); g.closePath();
  g.fillStyle = gv(0.1, 0.6); g.fill();
}
// the shank from the heel to the ring, then the ring itself
function drawHandle(g, sc, r, flange) {
  const L = sc.L;
  const { heel, mid, att, rc, ra, rx, ry, t, ax, e2, side } = shankGeom(sc, r);
  const shank = (c) => { c.beginPath(); c.moveTo(heel[0], heel[1]); c.quadraticCurveTo(mid[0], mid[1], att[0], att[1]); };
  g.lineCap = "round";
  g.strokeStyle = gv(0.14, 0.85); g.lineWidth = 0.062 * L + 2; shank(g); g.stroke();
  g.strokeStyle = gv(0.8); g.lineWidth = 0.062 * L; shank(g); g.stroke();
  g.strokeStyle = gv(0.95, 0.7); g.lineWidth = Math.max(0.6, 0.012 * L); shank(g); g.stroke();
  if (flange) {
    // (fix pass: no square box — only a small bump flush with the shank, 2–3 px, faintly outlined)
    const f = V.add(V.add([sc.x, sc.y], V.mul(ax, -0.19 * L)), V.mul(e2, side * 0.05 * L));
    g.save(); g.translate(f[0], f[1]); g.rotate(sc.ang);
    g.fillStyle = gv(0.78); g.strokeStyle = gv(0.2, 0.45); g.lineWidth = 0.8;
    g.beginPath(); g.ellipse(0, 0, 0.026 * L, 0.018 * L, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.restore();
  }
  // the loop: an annulus with a dark keyline both sides and a highlight along its upper-left
  g.save(); g.translate(rc[0], rc[1]); g.rotate(ra);
  g.beginPath(); g.ellipse(0, 0, rx + t / 2, ry + t / 2, 0, 0, Math.PI * 2); g.ellipse(0, 0, Math.max(1, rx - t / 2), Math.max(1, ry - t / 2), 0, 0, Math.PI * 2);
  g.fillStyle = gv(0.8); g.fill("evenodd");
  g.lineWidth = 1.1; g.strokeStyle = gv(0.14, 0.8);
  g.beginPath(); g.ellipse(0, 0, rx + t / 2, ry + t / 2, 0, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.ellipse(0, 0, Math.max(1, rx - t / 2), Math.max(1, ry - t / 2), 0, 0, Math.PI * 2); g.stroke();
  g.restore();
  // highlight on the side toward the light (upper left), in frame angles
  const hl = [];
  for (let k = 0; k <= 12; k++) {
    const phi = -2.6 + (k / 12) * 1.9;              // frame angle round the ring centre, −149° … −40°
    const q = phi - ra;
    const ex = Math.cos(q), ey = Math.sin(q);
    const s = 1 / Math.hypot(ex / (rx + t * 0.15), ey / (ry + t * 0.15));
    hl.push([rc[0] + Math.cos(phi) * s, rc[1] + Math.sin(phi) * s]);
  }
  g.strokeStyle = gv(0.97, 0.75); g.lineWidth = Math.max(0.7, t * 0.28); g.beginPath(); hl.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
}

export function drawScissors(g, sc) {
  const { x, y, ang, L, open = 0.1 } = sc;
  g.save(); g.lineJoin = "round";
  const R = sc.rings;
  // the upper ring (v > 0 side) carries the flange; the farther handle and blade first
  const up = (R[0].v || 0) >= (R[1].v || 0) ? 0 : 1;
  shankGap(g, sc);
  drawHandle(g, sc, R[1 - up], false);
  // (the far, lower blade can be foreshortened: sc.farK × L)
  drawBlade(g, x, y, ang + open / 2, L * (sc.farK ?? 1), 1);
  drawHandle(g, sc, R[up], true);
  drawBlade(g, x, y, ang - open / 2, L, -1);
  // the screw (fix pass): a small dark oval along the blades, ~4 × 3 px, with a thin highlight — not a ringed disc
  const rx = Math.max(1.5, 0.02 * L), ry = Math.max(1.1, 0.015 * L);
  g.save(); g.translate(x, y); g.rotate(ang);
  g.fillStyle = gv(0.42); g.strokeStyle = gv(0.12, 0.9); g.lineWidth = 0.9;
  g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.strokeStyle = gv(0.92, 0.7); g.lineWidth = 0.6; g.beginPath(); g.ellipse(0, 0, rx * 0.6, ry * 0.55, 0, Math.PI * 1.05, Math.PI * 1.7); g.stroke();
  g.restore();
  g.restore();
}
