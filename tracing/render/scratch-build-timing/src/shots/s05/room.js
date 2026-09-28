// s05 room plate (far layer): the cartons, the two speakers, the steel upright and the boxes on the right.
// Frame coordinates of the settled camera; the plate is painted with margins because the camera settles into
// place during the first 0.36 s (the far layer then sits up to ~190 px left and ~50 px low of its rest place).
// Values follow the source's light: the cartons are dim with bright vertical corrugation, the lit faces are the
// ones turned to the laptop; the speakers are dark wood with ringed drivers.
import { INK, grey, rng, taper, poly, blob, ell, lin, rad, line, curve, stroke, grain, quadAt, clearO, PI } from "./kit.js";
import * as T from "./trace.js";

const V = PI / 2;          // vertical stroke direction

// a carton face: dim value with a vertical corrugation (engraved lines) and a few dark grain breaks
function cartonFace(P, q, v0, v1, { dir = V, spacing = 0.18, seed = 1, n = 30, dark = 0.8, gx = null, lw = 2.2 } = {}) {
  const o = P.o;
  const [a, b] = gx || [q[0], q[1]];
  clearO(P, poly(q));
  // flat tone with painterly vertical streaks (the source's cartons read as brushed grey board, not line cuts)
  P.fill(poly(q), lin(a[0], a[1], b[0], b[1], [[0, v0 * 1.1], [1, v1 * 1.1]]), dir, { spacing: 0.06 });
  grain(o, q, Math.round(n * 1.4), { dir: "v", w: lw * 1.2, color: `rgba(0,0,0,${(dark * 0.7).toFixed(2)})`, seed, len: [0.3, 1], wav: 0.004 });
  grain(o, q, Math.round(n * 0.35), { dir: "v", w: lw * 0.7, color: `rgba(236,234,228,${(0.1 + v1 * 0.3).toFixed(2)})`, seed: seed + 100, len: [0.2, 0.7], wav: 0.004 });
}

function paintCartons(P) {
  const o = P.o;
  // ---- left carton stack (behind the left speaker)
  P.fill(poly(T.BOX_L1_TOP), 0.03, 0.02, { spacing: 0.25, style: 1 });
  cartonFace(P, [[-60, 105], [222, 107], [229, 320], [-60, 318]], 0.28, 0.24, { seed: 3, n: 46, gx: [[0, 0], [222, 0]] });
  cartonFace(P, [[-60, 320], [229, 320], [236, 480], [-60, 480]], 0.12, 0.1, { seed: 4, n: 40, gx: [[0, 0], [222, 0]] });
  // the lit side panel turned to the laptop
  cartonFace(P, T.BOX_L1_SIDE, 0.34, 0.42, { seed: 5, n: 10, spacing: 0.14, gx: [[222, 0], [265, 0]] });
  straight2(o, [[0, 106], [222, 107]], 1.6, "rgba(242,240,234,0.35)");
  straight2(o, [[222, 107], [235, 470]], 1.4, "rgba(0,0,0,0.9)");
  straight2(o, [[-60, 320], [229, 320]], 2.4, "rgba(0,0,0,0.85)");
  // a taped label on the front
  P.light(poly([[47, 120], [117, 118], [118, 193], [48, 195]]), 0.16, "source-over", 0.8);
  o.strokeStyle = "rgba(0,0,0,0.8)"; o.lineWidth = 2; o.strokeRect(47, 120, 70, 74);
  // ---- long low carton behind the laptop
  P.fill(poly(T.BOX_L2_TOP), lin(250, 100, 250, 150, [[0, 0.05], [1, 0.1]]), 0.03, { spacing: 0.22, style: 1 });
  cartonFace(P, T.BOX_L2_FRONT, 0.3, 0.46, { seed: 7, n: 60, spacing: 0.16, gx: [[320, 0], [686, 0]] });
  cartonFace(P, T.BOX_L2_LEFT, 0.02, 0.03, { seed: 8, n: 10 });
  P.light(poly([[480, 128], [535, 124], [535, 178], [480, 182]]), 0.34, "source-over", 0.7);
  straight2(o, [[320, 150], [686, 120]], 1.6, "rgba(242,240,234,0.35)");
  straight2(o, [[320, 210], [686, 182]], 2.4, "rgba(0,0,0,0.9)");
  // ---- top middle cartons (behind the lid's right corner): lit toward the screen on the right of the front
  cartonFace(P, T.BOX_M1_FRONT, 0.24, 0.42, { seed: 11, n: 36, gx: [[725, 0], [900, 0]] });
  P.light(poly([[790, 28], [838, 27], [838, 62], [790, 63]]), 0.06, "source-over", 0.9);
  cartonFace(P, T.BOX_M1_SIDE, 0.14, 0.1, { seed: 12, n: 22, dark: 0.7 });
  straight2(o, [[725, 150], [900, 160]], 2.2, "rgba(0,0,0,0.9)");
  straight2(o, [[900, -80], [900, 160]], 1.4, "rgba(242,240,234,0.35)");
  // the lit carton face right of the lid, and its dark top and side
  cartonFace(P, T.BOX_M2_FRONT, 0.4, 0.6, { seed: 13, n: 26, spacing: 0.14, gx: [[855, 0], [985, 0]] });
  P.fill(poly(T.BOX_M2_TOP), 0.04, 0.1, { spacing: 0.3, style: 1 });
  P.fill(poly(T.BOX_M2_SIDE), 0.01, V, { spacing: 0.35 });
  straight2(o, [[985, 185], [985, 472]], 1.6, "rgba(242,240,234,0.4)");
  straight2(o, [[855, 178], [985, 185]], 1.4, "rgba(242,240,234,0.4)");
  line(o, [[1068, 150], [1070, 205]], 1.4, "rgba(242,240,234,0.4)", 16);
  // dim boxes further back on the right, a rack grille, a cable
  cartonFace(P, [[1050, -80], [1140, -80], [1140, 128], [1080, 140], [1050, 140]], 0.07, 0.05, { seed: 15, n: 10, dark: 0.6 });
  P.fill(poly([[1043, 120], [1183, 128], [1183, 150], [1077, 150]]), 0.08, 0.05, { spacing: 0.3 });
  P.fill(poly([[1050, 147], [1077, 147], [1077, 220], [1050, 220]]), 0.16, V, { spacing: 0.25 });
  P.fill(poly([[1180, -80], [1300, -80], [1300, 110], [1180, 110]]), 0.05, V, { spacing: 0.35 });
  o.fillStyle = "rgba(242,240,234,0.13)";
  for (let y = 18; y < 100; y += 6) for (let x = 1206; x < 1290; x += 6) { o.beginPath(); o.arc(x, y, 1.1, 0, 7); o.fill(); }
  line(o, [[1066, 170], [1086, 190], [1102, 205]], 1.4, "rgba(242,240,234,0.35)", 17);
}

function straight2(o, pts, w, color) { line(o, pts, w, color, 3, 0.7); }

// ---- a speaker: wood-grain cabinet, two drivers seen at an angle
function driver(P, cx, cy, rx, ry, rot, lit, seed) {
  const o = P.o, r = rng(seed);
  // surround + cone: dark with bright rings on the lit side
  P.fill(ell(cx, cy, rx * 1.08, ry * 1.08, rot), 0.03, 0, { style: 2 });
  P.fill(ell(cx, cy, rx, ry, rot), rad(cx - rx * 0.25, cy - ry * 0.25, rx * 0.05, rx * 1.05, [[0, 0.5 * lit], [0.2, 0.18 * lit], [0.45, 0.07], [0.7, 0.12 * lit], [0.9, 0.04], [1, 0.25 * lit]]), 0, { style: 2 });
  o.save(); o.translate(cx, cy); o.rotate(rot); o.scale(rx, ry);
  o.lineWidth = 0.022; o.strokeStyle = `rgba(242,240,234,${0.55 * lit})`;
  o.beginPath(); o.arc(0, 0, 1.0, PI * 0.95, PI * 1.9); o.stroke();
  o.lineWidth = 0.015; o.strokeStyle = `rgba(242,240,234,${0.35 * lit})`;
  for (const k of [0.84, 0.62, 0.44]) { o.beginPath(); o.arc(0, 0, k, PI * (0.8 + r() * 0.2), PI * (1.8 + r() * 0.3)); o.stroke(); }
  // cone streaks
  for (let i = 0; i < 36; i++) { const a = PI * (0.7 + 1.3 * r()); o.strokeStyle = `rgba(242,240,234,${(0.05 + 0.18 * r()) * lit})`; o.lineWidth = 0.012; o.beginPath(); o.moveTo(Math.cos(a) * 0.32, Math.sin(a) * 0.32); o.lineTo(Math.cos(a) * 0.8, Math.sin(a) * 0.8); o.stroke(); }
  // dust cap with a glint
  o.fillStyle = "rgba(12,12,12,1)"; o.beginPath(); o.arc(0.03, 0.03, 0.28, 0, 7); o.fill();
  o.fillStyle = `rgba(242,240,234,${0.5 * lit})`; o.beginPath(); o.ellipse(-0.1, -0.1, 0.1, 0.06, -0.7, 0, 7); o.fill();
  o.lineWidth = 0.03; o.strokeStyle = "rgba(0,0,0,0.95)"; o.beginPath(); o.arc(0, 0, 1.06, 0, 7); o.stroke();
  o.restore();
}
function paintSpeakers(P) {
  const o = P.o;
  // left speaker: angled toward the desk, lit on its front
  cartonFace(P, [[235, 300], [345, 305], [345, 720], [285, 700]], 0.12, 0.08, { seed: 21, n: 16, dark: 0.7 });
  clearO(P, poly(T.SPK_L_SIDE));
  P.fill(poly(T.SPK_L_SIDE), lin(185, 0, 258, 0, [[0, 0.44], [1, 0.3]]), V - 0.03, { spacing: 0.2 });
  grain(o, T.SPK_L_SIDE, 12, { dir: "v", w: 1.8, color: "rgba(0,0,0,0.7)", seed: 22 });
  clearO(P, poly(T.SPK_L_FRONT));
  P.fill(poly(T.SPK_L_FRONT), lin(63, 400, 240, 700, [[0, 0.27], [0.5, 0.21], [1, 0.15]]), V - 0.07, { spacing: 0.16 });
  grain(o, T.SPK_L_FRONT, 34, { dir: "v", w: 2.2, color: "rgba(0,0,0,0.75)", seed: 23, len: [0.3, 1] });
  line(o, [T.SPK_L_FRONT[0], T.SPK_L_FRONT[1]], 2, "rgba(242,240,234,0.7)", 24);
  line(o, [T.SPK_L_FRONT[1], T.SPK_L_FRONT[2]], 1.8, "rgba(242,240,234,0.55)", 25);
  line(o, [T.SPK_L_FRONT[0], T.SPK_L_FRONT[3]], 1.6, "rgba(242,240,234,0.4)", 26);
  driver(P, 144, 439, 26, 52, -0.05, 0.9, 27);
  driver(P, 161, 611, 46, 98, -0.08, 1.0, 28);
  // centre speaker
  clearO(P, poly([[1128, 190], [1320, 200], [1320, 505], [1128, 500]]));
  P.fill(poly(T.SPK_C_SIDE), 0.06, V, { spacing: 0.3 });
  P.fill(poly(T.SPK_C_FRONT), lin(1147, 200, 1320, 505, [[0, 0.21], [0.5, 0.16], [1, 0.11]]), V, { spacing: 0.16 });
  grain(o, T.SPK_C_FRONT, 30, { dir: "v", w: 2.2, color: "rgba(0,0,0,0.75)", seed: 31, len: [0.3, 1] });
  line(o, [T.SPK_C_FRONT[0], T.SPK_C_FRONT[1]], 1.8, "rgba(242,240,234,0.6)", 32);
  line(o, [T.SPK_C_FRONT[0], T.SPK_C_FRONT[3]], 1.8, "rgba(242,240,234,0.5)", 33);
  driver(P, 1231, 262, 33, 34, 0, 0.9, 34);
  driver(P, 1230, 392, 64, 60, 0, 1.0, 35);
  // the thin cable/antenna left of it
  line(o, [[1080, 170], [1106, 196], [1128, 214]], 1.6, "rgba(242,240,234,0.5)", 36);
}

function paintRight(P) {
  const o = P.o;
  // steel upright with slots and two short rails
  P.fill(poly([[1957, -80], [2004, -80], [1952, 520], [1915, 520]]), lin(1917, 0, 1997, 0, [[0, 0.14], [0.5, 0.28], [1, 0.17]]), V + 0.08, { spacing: 0.16 });
  line(o, [[1957, -80], [1917, 520]], 1.8, "rgba(242,240,234,0.5)", 41);
  line(o, [[2003, -80], [1952, 520]], 1.4, "rgba(0,0,0,0.8)", 42);
  o.fillStyle = "#050505";
  for (let k = 0; k < 9; k++) { const y = 70 + k * 48, x = 1968 - (y / 500) * 30; o.beginPath(); o.roundRect(x - 5, y, 10, 26, 5); o.fill(); }
  P.fill(poly([[1877, 78], [1950, 88], [1950, 102], [1877, 94]]), 0.3, 0.1, { spacing: 0.2 });
  P.fill(poly([[1880, 118], [1948, 126], [1948, 134], [1880, 128]]), 0.26, 0.1, { spacing: 0.2 });
  // boxes on the right, in the dark
  P.fill(poly([[2050, 407], [2340, 385], [2340, 440], [2070, 452]]), lin(2050, 400, 2206, 450, [[0, 0.12], [1, 0.08]]), 0.03, { spacing: 0.22, style: 1 });
  cartonFace(P, [[2060, 452], [2340, 440], [2340, 640], [2065, 620]], 0.24, 0.16, { seed: 43, n: 36, gx: [[2060, 0], [2206, 0]] });
  cartonFace(P, [[2065, 620], [2340, 640], [2340, 780], [2080, 760]], 0.14, 0.1, { seed: 44, n: 24 });
  line(o, [[2060, 452], [2206, 440]], 1.6, "rgba(242,240,234,0.45)", 45);
  // under the chair: faint box edges
  P.fill(poly([[2000, 700], [2340, 690], [2340, 960], [2000, 960]]), 0.03, V, { spacing: 0.35 });
}

export function paintRoom(P) {
  paintRight(P);
  paintCartons(P);
  paintSpeakers(P);
}
