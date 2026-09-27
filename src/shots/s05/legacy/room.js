// s05 room plate (far layer): the cartons, the two speakers, the steel upright and the boxes on the right.
// Frame coordinates of the settled camera; the plate is painted with margins because the camera settles into
// place during the first 0.36 s (the far layer then sits up to ~190 px left and ~50 px low of its rest place).
// Values follow the source's light: the cartons are dim with bright vertical corrugation, the lit faces are the
// ones turned to the laptop; the speakers are dark wood with ringed drivers.
import { INK, grey, rng, taper, poly, blob, ell, lin, rad, line, curve, stroke, grain, quadAt, clearO, sampleCurve, PI } from "../kit.js";
import * as T from "../trace.js";

const V = PI / 2;          // vertical stroke direction

// a carton face: a flat dim tone brushed with irregular streaks along the board (dark grooves and pale scuffs of
// varied width, length and wobble, like the source's painterly cardboard), not engraved line cuts
function cartonFace(P, q, v0, v1, { dir = V, spacing = 0.18, seed = 1, n = 30, dark = 0.8, gx = null, lw = 2.2, paleK = 1 } = {}) {
  const o = P.o;
  const [a, b] = gx || [q[0], q[1]];
  clearO(P, poly(q));
  P.fill(poly(q), lin(a[0], a[1], b[0], b[1], [[0, v0], [1, v1]]), dir, { style: 2 });
  const r = rng(seed + 500);
  o.save(); o.beginPath(); poly(q)(o); o.clip();
  const N = Math.round(n * 1.3);
  for (let i = 0; i < N; i++) {
    const u = r(), L = 0.25 + r() * 0.75, t0 = r() * (1 - L), pale = r() < 0.4;
    const pts = [];
    for (let k = 0; k <= 6; k++) { const t = t0 + (L * k) / 6; pts.push(quadAt(q, u + Math.sin(t * 7 + i) * 0.006 + (r() - 0.5) * 0.004, t)); }
    const w = (pale ? 0.8 + r() * 2.2 : 0.8 + r() * lw * 1.3);
    const col = pale ? `rgba(230,228,222,${((0.06 + 0.2 * r()) * paleK * (0.4 + v1)).toFixed(3)})` : `rgba(0,0,0,${(dark * (0.25 + 0.45 * r())).toFixed(2)})`;
    taper(o, sampleCurve(pts, 3), (uu) => w * (0.3 + 0.7 * Math.pow(Math.sin(Math.PI * uu), 0.5)), col);
  }
  o.restore();
}
// packing tape on a carton: lighter than the board, a fine dot texture, a thin dark keyline
function tape(P, q, v, seed) {
  const o = P.o, r = rng(seed);
  P.fill(poly(q), v, V, { style: 2 });
  o.save(); o.beginPath(); poly(q)(o); o.clip();
  o.fillStyle = "rgba(20,20,20,0.3)";
  for (let y = 0; y < 90; y += 3) for (let x = 0; x < 90; x += 3) { const p = quadAt(q, x / 90, y / 90); o.beginPath(); o.arc(p[0] + (r() - 0.5), p[1] + (r() - 0.5), 0.6, 0, 7); o.fill(); }
  o.restore();
  o.strokeStyle = "rgba(10,10,10,0.75)"; o.lineWidth = 1.2; o.beginPath(); poly(q)(o); o.stroke();
}

function paintCartons(P) {
  const o = P.o;
  // ---- left carton stack (behind the left speaker)
  P.fill(poly(T.BOX_L1_TOP), 0.01, 0.02, { style: 2 });
  cartonFace(P, [[-60, 105], [222, 107], [229, 320], [-60, 318]], 0.28, 0.24, { seed: 3, n: 46, gx: [[0, 0], [222, 0]] });
  cartonFace(P, [[-60, 320], [229, 320], [236, 480], [-60, 480]], 0.08, 0.06, { seed: 4, n: 30, dark: 0.9, gx: [[0, 0], [222, 0]] });
  // the lit side panel turned to the laptop
  cartonFace(P, T.BOX_L1_SIDE, 0.34, 0.42, { seed: 5, n: 10, spacing: 0.14, gx: [[222, 0], [265, 0]] });
  straight2(o, [[0, 106], [222, 107]], 1.6, "rgba(242,240,234,0.35)");
  straight2(o, [[222, 107], [235, 470]], 1.4, "rgba(0,0,0,0.9)");
  straight2(o, [[-60, 320], [229, 320]], 2.4, "rgba(0,0,0,0.85)");
  // a taped label on the front
  tape(P, [[47, 120], [117, 118], [118, 193], [48, 195]], 0.3, 31);
  // ---- long low carton behind the laptop
  P.fill(poly(T.BOX_L2_TOP), lin(250, 100, 250, 150, [[0, 0.05], [1, 0.1]]), 0.03, { spacing: 0.22, style: 1 });
  cartonFace(P, T.BOX_L2_FRONT, 0.3, 0.46, { seed: 7, n: 60, spacing: 0.16, gx: [[320, 0], [686, 0]] });
  cartonFace(P, T.BOX_L2_LEFT, 0.02, 0.03, { seed: 8, n: 10 });
  tape(P, [[482, 130], [533, 127], [533, 178], [482, 181]], 0.48, 32);
  straight2(o, [[320, 150], [686, 120]], 1.6, "rgba(242,240,234,0.35)");
  straight2(o, [[320, 210], [686, 182]], 2.4, "rgba(0,0,0,0.9)");
  // ---- top middle cartons (behind the lid's right corner): lit toward the screen on the right of the front
  cartonFace(P, T.BOX_M1_FRONT, 0.24, 0.42, { seed: 11, n: 36, gx: [[725, 0], [900, 0]] });
  tape(P, [[790, 26], [836, 26], [836, 62], [790, 63]], 0.4, 33);
  cartonFace(P, T.BOX_M1_SIDE, 0.08, 0.06, { seed: 12, n: 22, dark: 0.7 });
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
  cartonFace(P, [[1050, -80], [1140, -80], [1140, 128], [1080, 140], [1050, 140]], 0.02, 0.01, { seed: 15, n: 6, dark: 0.6 });
  P.fill(poly([[1043, 120], [1183, 128], [1183, 150], [1077, 150]]), 0.08, 0.05, { spacing: 0.3 });
  P.fill(poly([[1050, 147], [1077, 147], [1077, 220], [1050, 220]]), 0.16, V, { spacing: 0.25 });
  P.fill(poly([[1180, -80], [1300, -80], [1300, 110], [1180, 110]]), 0.05, V, { spacing: 0.35 });
  o.fillStyle = "rgba(242,240,234,0.13)";
  for (let y = 18; y < 100; y += 6) for (let x = 1206; x < 1290; x += 6) { o.beginPath(); o.arc(x, y, 1.1, 0, 7); o.fill(); }
  line(o, [[1066, 170], [1086, 190], [1102, 205]], 1.4, "rgba(242,240,234,0.35)", 17);
}

function straight2(o, pts, w, color) { line(o, pts, w, color, 3, 0.7); }

// ---- a speaker: dark wood cabinet brushed with wavy grain, a lit front edge; drivers are dark cones with soft grey
// bands (not rings), a dark dust cap with one glint, a thin lit lip on the surround
function driver(P, cx, cy, rx, ry, rot, lit, seed) {
  const o = P.o, r = rng(seed);
  P.fill(ell(cx, cy, rx * 1.1, ry * 1.1, rot), 0.03, 0, { style: 2 });
  P.fill(ell(cx, cy, rx, ry, rot), rad(cx + rx * 0.2, cy + ry * 0.25, rx * 0.1, rx * 1.05, [[0, 0.01], [0.35, 0.03], [0.62, 0.1 * lit], [0.8, 0.04], [1, 0.02]]), 0, { style: 2 });
  o.save(); o.translate(cx, cy); o.rotate(rot); o.scale(rx, ry);
  // soft grey bands on the cone toward the lower right (blurred), two faint concentric grooves
  o.save(); o.beginPath(); o.arc(0, 0, 1, 0, 7); o.clip();
  o.filter = `blur(${(Math.min(rx, ry) * 0.06).toFixed(1)}px)`;
  o.strokeStyle = `rgba(200,198,192,${0.26 * lit})`; o.lineWidth = 0.12; o.beginPath(); o.arc(0, 0, 0.66, -0.2, 1.9); o.stroke();
  o.strokeStyle = `rgba(200,198,192,${0.18 * lit})`; o.lineWidth = 0.1; o.beginPath(); o.arc(0, 0, 0.9, 3.4, 5.4); o.stroke();
  o.filter = "none";
  o.lineWidth = 0.012; o.strokeStyle = `rgba(230,228,222,${0.22 * lit})`;
  for (const k of [0.82, 0.5]) { o.beginPath(); o.arc(0, 0, k, PI * (0.1 + r() * 0.2), PI * (0.9 + r() * 0.3)); o.stroke(); }
  o.restore();
  // the surround's lit lip, the dust cap with a glint
  o.lineWidth = 0.025; o.strokeStyle = `rgba(236,234,228,${0.45 * lit})`; o.beginPath(); o.arc(0, 0, 1.02, PI * 1.0, PI * 1.7); o.stroke();
  o.fillStyle = "rgba(10,10,10,1)"; o.beginPath(); o.arc(0.04, 0.04, 0.3, 0, 7); o.fill();
  o.fillStyle = `rgba(236,234,228,${0.55 * lit})`; o.beginPath(); o.ellipse(-0.08, -0.1, 0.1, 0.05, -0.7, 0, 7); o.fill();
  o.lineWidth = 0.03; o.strokeStyle = "rgba(0,0,0,0.95)"; o.beginPath(); o.arc(0, 0, 1.08, 0, 7); o.stroke();
  o.restore();
}
function paintSpeakers(P) {
  const o = P.o;
  // left speaker: angled toward the desk, lit on its front edge (the source: 32 front, 43 side)
  cartonFace(P, [[235, 300], [345, 305], [345, 720], [285, 700]], 0.12, 0.08, { seed: 21, n: 16, dark: 0.7 });
  cartonFace(P, T.SPK_L_SIDE, 0.3, 0.22, { seed: 22, n: 14, dark: 0.8, gx: [[187, 0], [275, 0]] });
  cartonFace(P, T.SPK_L_FRONT, 0.26, 0.18, { seed: 23, n: 44, dark: 0.8, lw: 2.4, gx: [[65, 0], [240, 0]], paleK: 1.8 });
  line(o, [T.SPK_L_FRONT[0], T.SPK_L_FRONT[1]], 2, "rgba(242,240,234,0.7)", 24);
  line(o, [T.SPK_L_FRONT[1], T.SPK_L_FRONT[2]], 1.8, "rgba(242,240,234,0.55)", 25);
  line(o, [T.SPK_L_FRONT[0], T.SPK_L_FRONT[3]], 2.2, "rgba(242,240,234,0.6)", 26);
  driver(P, 136, 440, 26, 52, -0.08, 1.3, 27);
  driver(P, 167, 612, 49, 102, -0.1, 1.6, 28);
  // centre speaker
  clearO(P, poly([[1128, 190], [1320, 200], [1320, 505], [1128, 500]]));
  P.fill(poly(T.SPK_C_SIDE), 0.06, V, { style: 2 });
  cartonFace(P, T.SPK_C_FRONT, 0.2, 0.13, { seed: 31, n: 40, dark: 0.8, lw: 2.4, gx: [[1147, 0], [1320, 0]], paleK: 1.4 });
  line(o, [T.SPK_C_FRONT[0], T.SPK_C_FRONT[1]], 1.8, "rgba(242,240,234,0.6)", 32);
  line(o, [T.SPK_C_FRONT[0], T.SPK_C_FRONT[3]], 2.4, "rgba(242,240,234,0.65)", 33);
  driver(P, 1231, 262, 33, 34, 0, 1.2, 34);
  driver(P, 1230, 392, 64, 60, 0, 1.4, 35);
  // the thin cable/antenna left of it
  line(o, [[1080, 170], [1106, 196], [1128, 214]], 1.6, "rgba(242,240,234,0.5)", 36);
}

function paintRight(P) {
  const o = P.o;
  // steel upright with slots and two short rails
  P.fill(poly([[1957, -80], [2004, -80], [1952, 520], [1915, 520]]), lin(1917, 0, 1997, 0, [[0, 0.12], [0.5, 0.22], [1, 0.14]]), V + 0.08, { style: 2 });
  grain(o, [[1957, -80], [2004, -80], [1952, 520], [1915, 520]], 10, { dir: "v", w: 1.6, color: "rgba(0,0,0,0.5)", seed: 40, len: [0.3, 1] });
  line(o, [[1957, -80], [1917, 520]], 1.8, "rgba(242,240,234,0.5)", 41);
  line(o, [[2003, -80], [1952, 520]], 1.4, "rgba(0,0,0,0.8)", 42);
  o.fillStyle = "#050505";
  for (let k = 0; k < 9; k++) { const y = 70 + k * 48, x = 1968 - (y / 500) * 30; o.beginPath(); o.roundRect(x - 5, y, 10, 26, 5); o.fill(); }
  P.fill(poly([[1877, 78], [1950, 88], [1950, 102], [1877, 94]]), 0.3, 0.1, { spacing: 0.2 });
  P.fill(poly([[1880, 118], [1948, 126], [1948, 134], [1880, 128]]), 0.26, 0.1, { spacing: 0.2 });
  // boxes on the right, in the dark
  P.fill(poly([[2050, 407], [2340, 385], [2340, 440], [2070, 452]]), lin(2050, 400, 2206, 450, [[0, 0.1], [1, 0.06]]), 0.03, { style: 2 });
  grain(o, [[2050, 407], [2340, 385], [2340, 440], [2070, 452]], 12, { dir: "u", w: 1.2, color: "rgba(230,228,222,0.18)", seed: 46, len: [0.3, 0.9], wav: 0.004 });
  cartonFace(P, [[2060, 452], [2340, 440], [2340, 640], [2065, 620]], 0.2, 0.14, { seed: 43, n: 36, gx: [[2060, 0], [2206, 0]] });
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
