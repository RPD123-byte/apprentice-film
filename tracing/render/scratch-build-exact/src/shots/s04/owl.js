// s04 owl: the glide in (19.12–19.68), the landing on his shoulder (19.68–20.20), and the perched owl the camera
// arc carries round (20.84–23.12), turning from front view through profile to its back.
// Built on the shared kit (owlInk.js) for the head/body/tufts/bandage/folded wings/feet. The face (round glossy
// eyes, facial-disc V, kite beak), the dark studio headphones and the flight wings (s02's fan wings, so the bird
// carries on unchanged from s02 across the 19.12 join) are drawn here, in owl units, through the kit's `extra` hook.
// One continuous build: the turn is a head yaw with the body/wing/tail pose interpolated between keys — never two
// owls in the same frame.
import { owlLayer, owlPose, headphoneGeom, ink, gv, LINE, featherShape, setPPU, V } from "../../lib/owlInk.js";
import { smoothPath } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";

const PI = Math.PI, TAU = PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const cl = (x) => Math.max(0, Math.min(1, x));
const sm = (x) => { x = cl(x); return x * x * (3 - 2 * x); };
export const tab = (T, t) => {
  if (t <= T[0][0]) return T[0].slice(1);
  for (let i = 1; i < T.length; i++) if (t <= T[i][0]) { const a = T[i - 1], b = T[i], f = (t - a[0]) / (b[0] - a[0]); return a.slice(1).map((v, k) => v + (b[k + 1] - v) * f); }
  return T[T.length - 1].slice(1);
};
// numeric interpolation of two poses with the same structure (numbers lerp, anything else switches at the middle)
function mixPose(a, b, t) {
  if (t <= 0) return a; if (t >= 1) return b;
  if (typeof a === "number" && typeof b === "number") return a + (b - a) * t;
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.map((v, i) => mixPose(v, b[i], t));
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const o = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = k in a && k in b ? mixPose(a[k], b[k], t) : t < 0.5 ? a[k] : b[k];
    return o;
  }
  return t < 0.5 ? a : b;
}
function keyed(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [ta, A] = keys[i - 1], [tb, B] = keys[i]; return mixPose(A, B, sm((t - ta) / (tb - ta))); }
  return keys[keys.length - 1][1];
}

// ---------------------------------------------------------------- the perched owl (measured on 20.5 at s = 1):
// head outline 1555–1800 x 207–385, head centre (1677, 309); eyes (1615, 340) (1720, 340) r 27.5; beak (1652–1680,
// 365–402); cups centred (1531, 305) (1815, 305), 48 x 110; band top y 137; bandage centre (1620, 241); tuft
// (1740–1785, 200–240); body 1535–1825 x 385–550; talons (1580–1630, 550–595) (1695–1740, 565–600).
const FACE = { spread: 0.43, el: -0.30, R: 27.5, beakEl: -0.74 };
const HP0 = { lift: 1.15, r: 56, bandR: 1.16, bandH: 1.66, tilt: 0.06, cupEl: 0.04, w: 10, back: 0.0 };
export const PERCH = owlPose("front", {
  light: [-0.5, -0.86],
  head: { x: 0, y: -146, rx: 124, ry: 104, yaw: -0.08, square: 2.0, jowl: 0.1 },
  body: { x: 0, y: 12, a: 106, b: 142, egg: 0.12 },
  tail: { base: [30, 70], tip: [50, 110], w: 20, n: 3 },
  eyes: { r: 0.01, spread: 2.9, el: 0 },                 // the kit's own eyes sit behind the head (ours: face())
  beak: { el: -0.74, lift: 1.0, w: 0.01, l: 0.01 },
  bandage: { az: -0.57, el: 0.71, size: 66, rot: -0.55 },
  tufts: [{ at: 0.56, size: 48, width: 0.32, lean: 0.35, second: 0.65, curl: 0.3 }],
  headphones: { on: false },
  disc: 0,
  wings: [
    { type: "folded", layer: "front", S: [100, -40], T: [128, 112], width: 44, back: 30, dir: 1 },
    { type: "folded", layer: "front", S: [-100, -40], T: [-118, 100], width: 26, back: 14, dir: -1 },
  ],
  feet: [{ x: -62, y: 98, rot: 0.1, size: 34, mode: "perch", toes: 4, seed: 2 }, { x: 40, y: 110, rot: -0.05, size: 34, mode: "perch", toes: 4, seed: 5 }],
});

// ---------------------------------------------------------------- drawing: face, headphones, chest (owl units)
function eye(g, e, R, st, roll) {
  const sx = 0.3 + 0.7 * e.nz;
  g.save(); g.translate(e.x, e.y); g.rotate(roll); g.scale(sx, 1);
  const open = st.open ?? 1;
  if (open < 0.2) {
    // shut: a soft lid line sagging in the middle, a lash flick at the outer end
    ink(g, [[-R * 1.0, -R * 0.08], [-R * 0.4, R * 0.18], [R * 0.4, R * 0.18], [R * 1.0, -R * 0.08]], 3.4, LINE, { end: 0.25 });
    ink(g, [[e.side * R * 0.95, -R * 0.06], [e.side * R * 1.15, -R * 0.2]], 1.6, LINE, { end: 0.2 });
    g.restore(); return;
  }
  g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fillStyle = gv(0.97); g.fill();
  g.save(); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
  const lk = st.look || [0, 0], ir = R * 0.8, ix = lk[0] * R * 0.12, iy = lk[1] * R * 0.12 + R * 0.04;
  const gr = g.createRadialGradient(ix - ir * 0.2, iy + ir * 0.35, ir * 0.1, ix, iy, ir);
  gr.addColorStop(0, gv(0.46)); gr.addColorStop(0.6, gv(0.26)); gr.addColorStop(1, gv(0.12));
  g.beginPath(); g.arc(ix, iy, ir, 0, TAU); g.fillStyle = gr; g.fill();
  g.lineWidth = 1.8; g.strokeStyle = LINE; g.stroke();
  g.beginPath(); g.arc(ix, iy + ir * 0.04, ir * 0.52, 0, TAU); g.fillStyle = gv(0.04); g.fill();
  g.beginPath(); g.ellipse(ix - ir * 0.36, iy - ir * 0.36, ir * 0.3, ir * 0.27, -0.5, 0, TAU); g.fillStyle = gv(0.99); g.fill();
  g.beginPath(); g.arc(ix + ir * 0.34, iy + ir * 0.4, ir * 0.11, 0, TAU); g.fill();
  if (open < 1) { g.fillStyle = gv(0.93); g.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4 * (1 - open) * 0.5); }
  g.restore();
  g.beginPath(); g.arc(0, 0, R, 0, TAU); g.lineWidth = 2.4; g.strokeStyle = LINE; g.stroke();
  // the upper lid: heavier over the top; the lower lid a thin grey arc under the eye
  const yl = open < 1 ? -R + 2 * R * (1 - open) * 0.5 : null;
  if (yl !== null) ink(g, [[-R * 0.98, yl], [0, yl + R * 0.08], [R * 0.98, yl]], 4, LINE, { end: 0.4 });
  else { g.beginPath(); g.arc(0, 0, R, PI * 1.08, PI * 1.92); g.lineWidth = 3.8; g.stroke(); }
  g.beginPath(); g.arc(0, R * 0.06, R * 1.16, PI * 0.2, PI * 0.8); g.lineWidth = 1.2; g.strokeStyle = gv(0.35, 0.6); g.stroke();
  g.restore();
}
function face(g, H, st) {
  const eyes = [-1, 1].map((sd) => ({ ...H.P(sd * FACE.spread, FACE.el), side: sd }));
  const vis = (e) => e.nz > 0.35;
  // the facial disc: two soft arcs over the eyes meeting in a V above the beak
  const top = H.P(0, -0.05, 1.0);
  for (const e of eyes) {
    if (!vis(e)) continue;
    const sx = 0.3 + 0.7 * e.nz, R = FACE.R;
    ink(g, [[top.x, top.y + R * 0.2], [e.x - e.side * R * 0.3 * sx, e.y - R * 1.35], [e.x + e.side * R * 0.7 * sx, e.y - R * 1.45]], 1.1, gv(0.45, 0.45), { end: 0.1 });
  }
  for (const e of eyes) if (vis(e)) eye(g, e, FACE.R, st, H.roll);
  // kite beak, turning with the head
  const b = H.P(0, FACE.beakEl, 1.03);
  if (b.nz > 0.05) {
    const sx = 0.35 + 0.65 * b.nz, w = 14 * sx;
    const kite = [[b.x, b.y - 19], [b.x + w, b.y - 2], [b.x, b.y + 19], [b.x - w, b.y - 2]];
    g.beginPath(); g.moveTo(kite[0][0], kite[0][1]); for (const p of kite.slice(1)) g.lineTo(p[0], p[1]); g.closePath();
    g.fillStyle = gv(0.88); g.fill(); g.lineWidth = 2.2; g.lineJoin = "round"; g.strokeStyle = LINE; g.stroke();
    ink(g, [[b.x - w * 0.8, b.y - 2], [b.x, b.y + 1], [b.x + w * 0.8, b.y - 2]], 1.1, gv(0.3, 0.6));
  }
}
// a studio cup: dark shell with a pale metal ring, a darker plate, a ribbed cushion toward the head
function cup(g, c, r, face01, edge01, roll) {
  const s = c.side;
  g.save(); g.translate(c.x, c.y); g.rotate(roll);
  const rx = r * (0.44 + 0.56 * face01), ry = r;
  // cushion: seen beside the shell when the cup is edge-on
  if (edge01 > 0.1) {
    const cx = -s * rx * 0.72, crx = r * 0.3 * edge01 + 1;
    g.beginPath(); g.ellipse(cx, r * 0.02, crx, ry * 0.97, 0, 0, TAU); g.fillStyle = gv(0.07); g.fill();
    g.save(); g.clip();
    const rr = rng(41);
    for (let i = -16; i <= 16; i++) { const y = (i / 16) * ry * 0.92; g.strokeStyle = gv(0.45 + 0.3 * rr(), 0.8); g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx - crx, y); g.lineTo(cx + crx * 0.6, y + 1); g.stroke(); }
    g.restore();
  }
  // shell
  g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fillStyle = gv(0.15); g.fill();
  g.lineWidth = 2.6; g.strokeStyle = LINE; g.stroke();
  // metal ring and the inner plate
  g.beginPath(); g.ellipse(s * rx * 0.06, 0, rx * 0.8, ry * 0.84, 0, 0, TAU); g.lineWidth = r * 0.075; g.strokeStyle = gv(0.52); g.stroke();
  const pg = g.createRadialGradient(s * rx * 0.05 - rx * 0.25, -ry * 0.3, 1, s * rx * 0.06, 0, ry * 0.7);
  pg.addColorStop(0, gv(0.5)); pg.addColorStop(0.5, gv(0.3)); pg.addColorStop(1, gv(0.16));
  g.beginPath(); g.ellipse(s * rx * 0.06, 0, rx * 0.66, ry * 0.7, 0, 0, TAU); g.fillStyle = pg; g.fill();
  g.lineWidth = 1.4; g.strokeStyle = gv(0.05, 0.9); g.stroke();
  // highlights: a bright arc on the ring, a soft glint on the plate
  g.beginPath(); g.ellipse(s * rx * 0.06, 0, rx * 0.8, ry * 0.84, 0, PI * 1.05, PI * 1.55); g.lineWidth = r * 0.045; g.strokeStyle = gv(0.92, 0.85); g.stroke();
  g.beginPath(); g.ellipse(s * rx * 0.06, 0, rx * 0.8, ry * 0.84, 0, PI * 0.1, PI * 0.35); g.lineWidth = r * 0.03; g.strokeStyle = gv(0.8, 0.6); g.stroke();
  // the yoke up to the band
  g.fillStyle = gv(0.12); g.beginPath(); g.roundRect(-r * 0.12, -ry * 1.18, r * 0.24, ry * 0.3, r * 0.05); g.fill();
  g.strokeStyle = gv(0.6, 0.8); g.lineWidth = 1.2; g.stroke();
  g.restore();
}
function phones(g, H, hpOpts) {
  const hp = headphoneGeom(H, hpOpts);
  const r = hpOpts.r, yaw = hpOpts.yaw ?? H.yaw;
  const hl = (pts) => ink(g, pts.map(([x, y]) => [x, y - 3]), 2.4, gv(0.7, 0.95), { end: 0.3 });
  const blk = (pts) => ink(g, pts, 11, LINE, { end: 0.85, pow: 0.3 });
  const cupOf = (c) => { const z = -c.sd * Math.sin(yaw); cup(g, c, r, cl(z), cl(Math.abs(Math.cos(yaw))), H.roll); };
  // the band's points behind the head (z < -0.25) and a cup turned away go behind everything already drawn
  // (destination-over: draw the top-most first)
  const far = [], near = [];
  let cur = null;
  hp.band.forEach((b, i) => { const f = b.z < -0.25; if (!cur || cur.f !== f) { if (cur) cur.pts.push(b.p); cur = { f, pts: i ? [hp.band[i - 1].p] : [] }; (f ? far : near).push(cur); } cur.pts.push(b.p); });
  g.save(); g.globalCompositeOperation = "destination-over";
  for (const sg of far) if (sg.pts.length > 1) { hl(sg.pts); blk(sg.pts); }
  for (const c of hp.cups) if (c.z < -0.3) cupOf(c);
  g.restore();
  for (const sg of near) if (sg.pts.length > 1) { blk(sg.pts); hl(sg.pts); }
  for (const c of hp.cups) if (c.z >= -0.3) cupOf(c);
}
// feather ticks across the chest (the source's fine plumage), fading as the bird turns away
function chest(g, body, k) {
  if (k <= 0.02) return;
  const r = rng(77);
  g.save(); g.beginPath(); g.ellipse(body.x, body.y, body.b * 0.92, body.a * 0.9, 0, 0, TAU); g.clip();
  for (let i = 0; i < 70; i++) {
    const u = r() * 2 - 1, v = r();
    const x = body.x + u * body.b * 0.75, y = body.y - body.a * 0.35 + v * body.a * 1.1;
    const w = 7 + r() * 6;
    ink(g, [[x - w, y - 3], [x, y + 2], [x + w, y - 3]], 1.0, gv(0.45, 0.35 * k), { end: 0.1 });
  }
  g.restore();
}

// ---------------------------------------------------------------- fan wings (s02's flight wings, by tip position)
function feather(g, root, dir, L, w, tone = 0.95) {
  const f = featherShape(root, dir, L, w);
  g.beginPath(); smoothPath(g, f, true);
  const e = V.add(root, V.mul(dir, L));
  const gr = g.createLinearGradient(root[0], root[1], e[0], e[1]);
  gr.addColorStop(0, gv(tone - 0.14)); gr.addColorStop(0.5, gv(tone)); gr.addColorStop(1, gv(tone - 0.04));
  g.fillStyle = gr; g.fill();
  g.lineWidth = 2.0; g.strokeStyle = gv(0.3, 0.8); g.lineJoin = "round"; g.stroke();
  ink(g, [V.add(root, V.mul(dir, L * 0.12)), V.add(root, V.mul(dir, L * 0.7))], 1.1, gv(0.55, 0.5), { end: 0.1 });
}
// a broad fan wing from shoulder S whose outermost primary ends at P (owl units); len = feather length
export function fanWing(g, sd, S, P, len = 150) {
  const D = V.sub(P, S), dl = V.len(D) || 1, u = V.mul(D, 1 / dl);
  const n = sd > 0 ? [u[1], -u[0]] : [-u[1], u[0]];            // the leading edge side
  const L = Math.min(len, dl * 0.55);
  const Wr = V.add(V.add(S, V.mul(D, 0.36)), V.mul(n, dl * 0.1));
  const hand = V.nrm(V.sub(P, Wr)), hl = V.len(V.sub(P, Wr));
  const T = V.add(Wr, V.mul(hand, Math.max(10, (hl - 1.25 * L) / 0.8)));
  const tr = V.mul(n, -1);
  for (let i = 7; i >= 0; i--) {
    const f = i / 7, root = V.mix(Wr, T, 0.05 + 0.75 * f);
    const dir = V.nrm(V.mix(tr, hand, 0.15 + 0.85 * Math.pow(f, 0.8)));
    feather(g, root, dir, L * (0.95 + 0.3 * f), 44 * L / 150);
  }
  for (let i = 6; i >= 0; i--) {
    const f = i / 6, root = V.mix(S, Wr, 0.1 + 0.9 * f);
    feather(g, root, V.nrm(V.add(tr, V.mul(V.nrm(V.sub(Wr, S)), -0.12))), L * (0.78 + 0.1 * f), 46 * L / 150);
  }
  for (const [nn, ln, w, off] of [[8, 0.5, 40, 0.3], [7, 0.34, 36, 0.12]]) {
    for (let i = nn - 1; i >= 0; i--) {
      const f = i / (nn - 1), root = f < 0.7 ? V.mix(S, Wr, f / 0.7) : V.mix(Wr, T, (f - 0.7) / 0.3 * 0.35);
      const dir = f < 0.7 ? tr : V.nrm(V.mix(tr, hand, (f - 0.7) / 0.3 * 0.6));
      feather(g, V.add(root, V.mul(dir, L * off * 0.3)), dir, L * ln, w * L / 150, 0.97);
    }
  }
  const lead = [S, V.mix(S, Wr, 0.5), Wr, V.mix(Wr, T, 0.35)];
  ink(g, lead, 34 * L / 150, gv(0.3, 0.85), { end: 0.5, pow: 0.3 });
  ink(g, lead, 30 * L / 150, gv(0.97), { end: 0.5, pow: 0.3 });
}

// ---------------------------------------------------------------- the flight and the landing (19.12–20.24)
// Head top (y) and centre x of the bird per frame (bright-blob measurements of the source, snapshots/s04-fix1-study),
// wing tips (frame px; R = viewer-right wing, L = viewer-left; * the R tip past the frame edge extrapolated).
// [t, headCx, headTop, Lx, Ly, Rx, Ry, roll]
const FLY = [
  [19.12, 1712, 74, 1330, 60, 2173, 335, 0.08], [19.16, 1714, 76, 1378, 18, 2205, 257, 0.07], [19.2, 1719, 77, 1430, -10, 2230, 150, 0.06],
  [19.24, 1722, 79, 1447, -25, 2235, 95, 0.05], [19.28, 1726, 81, 1425, -20, 2230, 150, 0.04], [19.32, 1727, 84, 1405, -15, 2215, 230, 0.03],
  [19.36, 1724, 93, 1472, 123, 2175, 413, 0.02], [19.4, 1722, 100, 1480, 129, 2168, 421, 0.01], [19.44, 1718, 107, 1487, 96, 2198, 348, 0],
  [19.48, 1714, 116, 1477, 48, 2225, 243, 0], [19.52, 1709, 125, 1479, 35, 2235, 199, 0], [19.56, 1703, 135, 1490, 72, 2225, 237, 0],
  [19.6, 1696, 146, 1497, 99, 2196, 258, 0], [19.64, 1690, 161, 1489, 65, 2161, 202, 0], [19.68, 1686, 176, 1481, 37, 2120, 125, 0],
  [19.72, 1683, 190, 1485, 50, 2080, 108, 0], [19.76, 1681, 205, 1492, 111, 2105, 170, 0], [19.8, 1680, 214, 1495, 200, 2131, 232, 0],
  [19.84, 1680, 222, 1470, 330, 2143, 323, 0], [19.88, 1680, 224, 1480, 380, 2129, 408, 0], [19.92, 1680, 224, 1492, 392, 2086, 486, 0],
  [19.96, 1680, 223, 1495, 392, 2024, 535, 0], [20.0, 1680, 221, 1495, 390, 1973, 552, 0], [20.04, 1680, 219, 1503, 398, 1925, 550, 0],
  [20.08, 1680, 217, 1503, 398, 1925, 550, 0], [20.12, 1680, 214, 1509, 440, 1876, 536, 0], [20.16, 1680, 211, 1517, 440, 1852, 516, 0],
  [20.2, 1680, 208, 1526, 440, 1836, 473, 0], [20.28, 1679, 205, 1526, 440, 1836, 473, 0], [20.4, 1678, 205, 1526, 440, 1836, 473, 0],
];
// the flying bird: the perched build with a longer hanging body and dangling talons
const FLYPOSE = { body: { x: 0, y: 14, a: 110, b: 128, egg: 0.05 }, feet: [{ x: -44, y: 118, rot: 0.15, size: 30, mode: "dangle", toes: 4, seed: 2 }, { x: 44, y: 114, rot: -0.1, size: 30, mode: "dangle", toes: 4, seed: 5 }] };
const HEADTOP = 146 + 104;          // root below the head top (owl units at s = 1)
export function landing(t) {
  const [hx, htop, lx, ly, rx, ry, roll] = tab(FLY, t);
  const land = sm((t - 19.64) / 0.2);            // body settles onto the shoulder 19.64 → 19.84
  const root = [hx, htop + HEADTOP];
  // (copied: mixPose returns its end keys themselves, and the fields below are reassigned)
  const pose = { ...mixPose(mergePoseLite(PERCH, FLYPOSE), PERCH, land) };
  pose.head = { ...pose.head, roll };
  // wings: fan wings until the fold is done (20.20); the folded wings of the perched build after that
  const wingsOn = t < 20.14;
  if (wingsOn) pose.wings = [];
  const open = t < 19.74 ? 0 : t < 19.78 ? 0.45 : 1;
  // the measured tips already fold in (19.9–20.14); the folded wings of the perched build take over after that
  const fan = wingsOn ? { L: [lx - root[0], ly - root[1]], R: [rx - root[0], ry - root[1]], showL: t < 20.06, fold: 0 } : null;
  return { pose, place: { x: root[0], y: root[1], s: 1, rot: 0 }, eyes: { open, look: [0, 0] }, fan, chest: 1 };
}
function mergePoseLite(a, b) { const o = { ...a }; for (const k of Object.keys(b)) o[k] = b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) ? { ...a[k], ...b[k] } : b[k]; return o; }

// ---------------------------------------------------------------- carried round by the arc (20.84–23.12)
// Head centre (frame px) per time: 20.84–21.64 from the measured belly track (head 146 px above it), after that
// from the facing cup and the eye/beak positions on gridded frames (snapshots/s04-fix1-study/owlarc*.jpg).
// [t, headCx, headCy, s]
const HEADC = [[20.84, 1682, 309, 1.0], [20.92, 1689, 309, 1.0], [21.0, 1699, 310, 1.0], [21.08, 1703, 311, 1.0], [21.16, 1729, 311, 1.0], [21.24, 1759, 312, 1.01],
  [21.32, 1797, 314, 1.02], [21.4, 1838, 316, 1.03], [21.48, 1856, 322, 1.04], [21.56, 1888, 332, 1.05], [21.64, 1922, 344, 1.06], [21.72, 1958, 352, 1.07],
  [21.8, 1995, 356, 1.08], [21.88, 2030, 358, 1.09], [21.96, 2062, 359, 1.1], [22.12, 2085, 382, 1.12], [22.28, 2040, 406, 1.13], [22.44, 1960, 422, 1.14],
  [22.6, 1820, 433, 1.14], [22.76, 1767, 431, 1.14], [22.92, 1675, 415, 1.13], [23.08, 1650, 384, 1.12], [23.12, 1645, 380, 1.12]];
// the head's turn (radians, + = face toward viewer-right), read off the source's cup/eye/beak positions
// (snapshots/s04-fix1-study/i-owl-both.jpg): front to 21.5, three-quarter with the eyes visible to 22.28, the cup
// facing the camera at 22.36, the back of the head from ~22.6
const YAW = [[20.84, -0.08], [21.5, -0.1], [21.64, -0.25], [21.8, -0.45], [21.96, -0.65], [22.12, -0.9], [22.28, -1.2], [22.36, -1.5], [22.44, -1.7], [22.6, -2.0], [22.76, -2.25], [22.92, -2.35], [23.12, -2.4]];
// body/wing/tail keys as the camera comes round its left side
const SIDEK = mergePoseLite(PERCH, {
  body: { x: 40, y: 30, a: 118, b: 146, egg: -0.05 },
  tail: { base: [90, 90], tip: [170, 170], w: 30, n: 3 },
  wings: [
    { type: "folded", layer: "front", S: [30, -64], T: [168, 140], width: 64, back: 40, dir: 1 },
    { type: "folded", layer: "front", S: [-104, -50], T: [-118, 96], width: 8, back: 6, dir: -1 },
  ],
  feet: [{ x: -30, y: 124, rot: 0.2, size: 32, mode: "perch", toes: 4, seed: 4 }, { x: 60, y: 130, rot: 0.1, size: 32, mode: "perch", toes: 4, seed: 9 }],
});
const BACKK = mergePoseLite(PERCH, {
  body: { x: 40, y: 40, a: 130, b: 140, egg: -0.05 },
  tail: { base: [100, 120], tip: [200, 230], w: 36, n: 3 },
  wings: [
    { type: "folded", layer: "front", S: [0, -70], T: [160, 190], width: 70, back: 46, dir: 1 },
    { type: "folded", layer: "front", S: [-90, -40], T: [-30, 170], width: 40, back: 20, dir: -1 },
  ],
  feet: [{ x: -20, y: 132, rot: 0.2, size: 30, mode: "perch", toes: 4, seed: 4 }, { x: 70, y: 138, rot: 0.1, size: 30, mode: "perch", toes: 4, seed: 9 }],
});
const BODYK = [[21.5, PERCH], [22.2, SIDEK], [22.7, BACKK]];
export function carried(t) {
  const [hx, hy, s] = tab(HEADC, t), [yaw] = tab(YAW, t);
  const pose = { ...keyed(BODYK, t) };
  pose.head = { ...pose.head, yaw };
  // the plaster: on the owl's right brow while it faces us; once its face has turned away (both positions hidden at
  // yaw ≈ -1.3) it is drawn where the source shows it from behind, high on the back of the head
  if (yaw < -1.3) pose.bandage = { az: 2.35, el: 0.62, size: 70, rot: 0.4 };
  const root = [hx, hy + 146 * s];
  return { pose, place: { x: root[0], y: root[1], s, rot: 0 }, eyes: { open: 1, look: [0, 0] }, fan: null, chest: cl(1 - Math.abs(yaw) / 1.2), dim: t > 22.3 ? lerp(1, 0.9, sm((t - 22.3) / 0.4)) : 1 };
}

// ---------------------------------------------------------------- render one owl state into a canvas (frame px)
export function owlAt(st, canvas) {
  const hpOpts = { ...HP0, yaw: (st.pose.head.yaw || 0) + (HP0.back || 0) };
  const extra = (g, geo) => {
    phones(g, geo.H, hpOpts);
    face(g, geo.H, st.eyes);
    chest(g, st.pose.body, st.chest ?? 0);
  };
  // the headphone band arcs above the kit's bbox: an invisible foot under the band makes the layer tall enough
  const pin = (x, y) => ({ x, y, rot: 0, size: 0.01, mode: "stand", leg: 0, toes: 3, seed: 1 });
  const pose = { ...st.pose, feet: [...(st.pose.feet || []), pin(0, -340), pin(-230, -150), pin(230, -150)] };
  return owlLayer({ ...pose, ...st.place, canvas, extra });
}
// draw the state: fan wings (behind), then the bird
export function drawOwlState(ctx, st, canvas) {
  const { x, y, s } = st.place;
  if (st.fan) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); setPPU(s);
    const f = st.fan, k = 1 - f.fold;
    const SR = [100, -40], SL = [-100, -40];
    // folding: the tip draws in toward the folded wing's tip (138, 104) and the feathers shorten
    const tipR = V.mix([128, 112], f.R, k), tipL = V.mix([-118, 100], f.L, k);
    ctx.filter = "blur(1.6px)";
    if (f.showL) fanWing(ctx, -1, SL, tipL, 150 * (0.4 + 0.6 * k));
    fanWing(ctx, 1, SR, tipR, 150 * (0.4 + 0.6 * k));
    ctx.filter = "none";
    ctx.restore(); setPPU(1);
  }
  const O = owlAt(st, canvas);
  if (st.dim && st.dim < 1) ctx.filter = `brightness(${st.dim})`;
  ctx.drawImage(O.canvas, O.x, O.y, O.w, O.h);
  ctx.filter = "none";
  return O;
}
