// s23 — the owl, drawn by the B&W owl kit (src/lib/owlInk.js, F4c parts). This file only POSES it: one front-view
// base fitted to the source's drawing in this segment (a big wide head on a small round body, glossy eyes under
// heavy angry brows, the crossed plaster on its right brow, a slim dark band with dark cups at the sides, a small
// shield beak, long wing feathers), plus the per-beat variants (carrying, pressing, hopping, wiping, crouching,
// powered up, holding two pairs of scissors, flying). Props (scissors) are drawn by props.js in owl units.
//
// Units are the kit's owl units: root (0,0) = middle of the body, y down. PLACE[name] = the frame placement
// { x, y, s } measured on the source frame named in the comment (2–3x labelled crops, silhouette overlays in
// snapshots/s23r-src/fit-*.jpg).
import { owlLayer, mergePose, ink, gv, LINE, V, drawWing, bodyOutline } from "../../lib/owlInk.js";
import { drawScissorsU } from "./props.js";
import { FW, LW, mirrorW, wingPts, paintWing23 } from "./wings.js";

const V2 = { ink: "solid", disc: "line", flow: [0, 1], merge: true, grain: 3, light: [-0.5, -0.86] };
// a standing foot tucked under the body (fix pass 1: the earlier feet hung on 10–18-unit stick legs): short chunky
// toes, dark claws, no visible leg; y = the foot's root, hidden inside the body (the toes reach ~50 units below it)
const FOOT = (x, y, rot, seed, o = {}) => ({ x, y: y + 22, rot: rot * 0.5, size: 30, mode: "grip", toes: 3, leg: 0, spread: 0.5, claw: "dark", seed, ...o });

// ---------------------------------------------------------------- base: the pressing owl at 88.88 s (s = 0.425)
// measured (frame px, root at 721, 320): head 673–770 wide, crown 232, eyes (708, 278) / (742, 278) r ≈ 9, cups at
// x 671 / 773 level with the eyes, band top 210, plaster (715, 247), beak (727, 292), body 673–770, feet at 355–362
export const BASE = {
  ...V2,
  head: { x: 0, y: -122, rx: 116, ry: 88, yaw: 0, pitch: 0, roll: 0, square: 2.5, jowl: 0.35 },
  tufts: [
    { at: -0.8, size: 26, width: 0.3, lean: 0.25, spikes: 2, fan: 0.4, curl: 0.2, seed: 3, valley: 0.55 },
    { at: 0.8, size: 30, width: 0.34, lean: -0.25, spikes: 3, fan: 0.5, curl: 0.3, seed: 5, valley: 0.6 },
  ],
  // fix pass 1: a squat pear merged with the head (no waist): 665–775 × to 358 at 88.88 (was an egg-ball)
  body: { x: -2, y: 4, a: 86, b: 126, rot: Math.PI / 2, egg: -0.14, sag: 0 },
  tail: null,
  wings: [],
  // chunky feet tucked under the body, toes on the lip (feet at (695, 360) / (750, 360) at 88.88)
  feet: [FOOT(-58, 50, 0.1, 2), FOOT(66, 50, -0.1, 5)],
  eyes: { state: "glossy", r: 23, spread: 0.36, el: -0.3, look: [0, 0.15], over: { sx: 1, iris: 0.66, lid: 0.3, droop: -0.5, catch: true } },
  brow: { w: 1.0, slant: 0.55 },
  beak: { el: -0.72, lift: 1.08, w: 26, l: 28, style: "shield" },
  bandage: { az: -0.2, el: 0.52, size: 66, rot: -0.2 },
  headphones: { on: true, yaw: 0, lift: 1.04, r: 36, bandR: 1.2, bandH: 1.55, tilt: 0, cupEl: 0.02, w: 10, slim: true, cupStyle: "side", open: 0.55 },
};

// angry brows over the glossy eyes (the kit's glossy eye has no brow): a heavy wedge slanting down to the beak.
// B = { w, slant, dy } for both eyes, or B.left / B.right per eye (null = none)
function brows(g, geo, B) {
  if (!B) return;
  for (const e of geo.eyes) {
    const o = e.side < 0 ? (B.left === undefined ? B : B.left) : (B.right === undefined ? B : B.right);
    if (!o) continue;
    const r = e.r, inner = -e.side, sl = o.slant ?? 0.5, w = o.w ?? 1;
    const y0 = e.y - r * (1.28 - 0.1 * sl) + (o.dy ?? 0) * r, yIn = y0 + r * 0.62 * sl;
    const pts = [[e.x - inner * r * 1.15, y0 - r * 0.1], [e.x - inner * r * 0.2, y0 + (yIn - y0) * 0.35], [e.x + inner * r * 0.95, yIn]];
    ink(g, pts, r * 0.2 * w + 1.2, LINE, { end: 0.22, bias: 0.62 });
  }
}

// dark headphone cups (the source's cups in this segment are near-black padded ovals with a pale rim highlight),
// painted over the kit's cups; far cups (z < 0) stay hidden behind the head
function darkCups(g, geo, HP) {
  if (!geo.hp || !HP || HP.dark === false) return;
  const r = HP.r ?? 40, H = geo.H;
  for (const c of geo.hp.cups) {
    if (c.z < -0.05) continue;
    const w = r * (0.42 + 0.3 * (c.open ?? 0.5)), h = r * 1.02, rot = (H.roll || 0) + c.side * (HP.cupRot ?? 0.08);
    g.save(); g.translate(c.x + c.side * r * 0.12, c.y); g.rotate(rot);
    const gr = g.createLinearGradient(-w, -h, w, h);
    gr.addColorStop(0, gv(0.3)); gr.addColorStop(0.45, gv(0.1)); gr.addColorStop(1, gv(0.05));
    g.beginPath(); g.ellipse(0, 0, w, h, 0, 0, Math.PI * 2); g.fillStyle = gr; g.fill();
    g.lineWidth = Math.max(1.2, r * 0.07); g.strokeStyle = gv(0.04); g.stroke();
    // the cushion edge toward the head and a pale rim highlight on the outer side
    g.beginPath(); g.ellipse(-c.side * w * 0.45, 0, w * 0.5, h * 0.92, 0, 0, Math.PI * 2); g.lineWidth = Math.max(0.8, r * 0.05); g.strokeStyle = gv(0.28, 0.9); g.stroke();
    g.beginPath(); g.ellipse(0, 0, w * 0.82, h * 0.86, 0, c.side > 0 ? -1.2 : Math.PI + 0.3, c.side > 0 ? -0.3 : Math.PI + 1.2); g.lineWidth = Math.max(0.8, r * 0.06); g.strokeStyle = gv(0.62, 0.85); g.stroke();
    g.restore();
  }
}

// ---------------------------------------------------------------- wing builders (owl units; sd = -1 viewer-left)
// a spread (layered) wing given for the viewer-left side and mirrored for sd = +1
function spreadW(sd, S, Wr, T, o = {}) {
  const f = (p) => [sd < 0 ? p[0] : -p[0], p[1]];
  return { type: "spread", style: "layered", layer: o.layer || "back", S: f(S), Wr: f(Wr), T: f(o.Tr && sd > 0 ? o.Tr : T), trail: f(o.trail || [-0.45, 0.9]), len: o.len ?? 110, spread: o.spread ?? 0.35, n: o.n ?? 8, m: o.m ?? 7, fw: o.fw ?? 0.8, point: o.point ?? 0.5, secLen: o.secLen ?? 1.45, cov: 2, bulge: o.bulge ?? 0.04, seed: (o.seed ?? 41) + (sd > 0 ? 2 : 0) };
}
function raisedW(sd, S, Wr, T, o = {}) {
  const f = (p) => [sd < 0 ? p[0] : -p[0], p[1]];
  return { type: "raised", layer: o.layer || "back", S: f(S), Wr: f(Wr), T: f(T), trail: f(o.trail || [-0.85, 0.45]), len: o.len ?? 120, secLen: o.secLen ?? 1.2, spread: o.spread ?? 0.35, n: o.n ?? 8, m: o.m ?? 6, fw: o.fw, point: o.point, seed: (o.seed ?? 31) + (sd > 0 ? 2 : 0) };
}
function armW(sd, S, Wr, T, o = {}) {
  const f = (p) => [sd < 0 ? p[0] : -p[0], p[1]];
  return { type: "arm", style: "feathered", layer: o.layer || "front", S: f(S), Wr: f(Wr), T: f(T), len: o.len ?? 34, fingers: o.fingers ? f(o.fingers) : undefined, nf: o.nf ?? 4, fingerLen: o.fingerLen ?? 1.4 };
}
const pair = (fn, ...a) => [fn(-1, ...a), fn(1, ...a)];
// a pair of band wings from measured shoulders and wing tips (owl units): the wrist 62 % of the way out, primaries
// fanning from (dir − fan) at the wrist to dir at the tip, secondaries hanging at (dir − drop) off the arm; lengths as
// fractions of the shoulder→tip distance (fitted on 84.60: carry)
function bandW(S, tip, sd, o = {}) {
  // S, tip given on the viewer-left side (right wings are passed mirrored and mirrored back)
  const Sl = S, Tl = tip, D = Math.hypot(Tl[0] - Sl[0], Tl[1] - Sl[1]), d = (Math.atan2(Tl[1] - Sl[1], Tl[0] - Sl[0]) * 180 / Math.PI + 360) % 360;
  const Wr = [Sl[0] + (Tl[0] - Sl[0]) * 0.62, Sl[1] + (Tl[1] - Sl[1]) * 0.62], hand = [(Tl[0] - Sl[0]) * 0.18, (Tl[1] - Sl[1]) * 0.18];
  const w = LW(Sl, Wr, d - (o.fan ?? 69), d + 1, D * (o.p0 ?? 0.44), D * (o.p1 ?? 0.28), d - (o.drop ?? 94), D * (o.sec ?? 0.38), { hand, n: o.n ?? 9, m: o.m ?? 6, cover: D * 0.21, seed: (o.seed ?? 7), sfan: 0.3, pw: 0.3, sw: 0.4 });
  return sd < 0 ? w : mirrorW(w);
}
const bandPair = (Sl, Tl, Sr, Tr, o = {}) => [bandW(Sl, Tl, -1, o), bandW([-Sr[0], Sr[1]], [-Tr[0], Tr[1]], 1, o)];
// a fan wing measured in FRAME px on a source frame with the owl placed at pl = { x, y, s }: hinge (frame px), a0 / a1
// (deg, canvas angles: 180 = left, 270 = up), lengths L0 / Lpk / L1 in frame px; o.fpk etc.
function fanF(pl, hinge, a0, a1, L0, Lpk, L1, o = {}) {
  const u = (v) => v / pl.s, h = [u(hinge[0] - pl.x), u(hinge[1] - pl.y)];
  return FW(h, a0, a1, u(L0), u(Lpk), u(L1), { n: 12, fpk: 0.8, hr: u(14), cover: u(46), back: u(12), fw: 0.34, seed: 3, ...o });
}

// ---------------------------------------------------------------- poses
const P = {};
P.base = BASE;
// standing tall (wiping, powered up, holding the scissors: fit at 90.80 / 94.00 — head centre 165 units above the body
// centre, body bottom +100, feet +126..+150)
// fix pass 1: a taller pear under the head (wipe 90.80: 630–735 × to 568; power 93.24: 640–775 × to 575), the head
// sunk into it, the feet tucked under its bottom
const TALL = mergePose(BASE, {
  head: { y: -168, rx: 118, ry: 100 }, body: { x: 6, y: 0, a: 118, b: 124, egg: 0.04 },
  feet: [FOOT(-50, 72, 0.2, 2), FOOT(58, 72, -0.2, 5)],
});
// pressing the banner flat (88.40–89.56, fit at 88.88: silhouette IoU 0.68 on the white parts)
P.press = mergePose(BASE, { wings: pair(spreadW, [-96, -112], [-235, -112], [-350, -86], { Tr: [-370, -86] }) });

// carrying (84.12–85.76 the old strip, 86.56–88.04 the banner): walking on the hole's lower lip, both wings raised
// in a V to hold the load's lower edge, head turned to our left, the right eye squeezed shut (fit at 84.60, s 0.42,
// root 1398, 312: head centre (1373, 245), wing tips (1240, 185) / (1525, 180), body 1348–1440 × 270–345, feet 358)
// fix pass 1: feet tucked under the body (toes on the lip at y ≈ 358 at 84.60: feet (1390, 355) / (1420, 352)); the
// walk cycle lifts one foot a little (its toes shorter under the body) instead of swinging stick legs
// fix pass 2 (2112, labelled crop): short stepping legs show under the body (feet ≈ (1310, 345) / (1390, 340) with
// the root at (1371, 312)); the cycle on twos swaps which foot is lifted
const FT = (x, y, rot, lift, sd) => FOOT(x, y - lift, rot, sd, { size: 26, leg: 24 });
const CARRY_FEET = [
  [FT(-128, 50, 0.5, 10, 2), FT(40, 52, -0.2, 0, 5)],
  [FT(-100, 52, 0.2, 0, 2), FT(58, 50, -0.3, 4, 5)],
  [FT(-90, 52, 0.2, 0, 2), FT(84, 48, -0.55, 10, 5)],
  [FT(-112, 50, 0.3, 4, 2), FT(50, 52, -0.2, 0, 5)],
];
const CARRY_PL = { x: 1398, y: 312, s: 0.42 };
// fix pass 1: the raised wings are FANS from the shoulder (measured at 84.60: left feathers from the shoulder (1345, 292)
// out to the tip (1245, 190) at 226°, (1265, 250) at 208°, (1300, 305) at 160°; right from (1440, 290) to (1525, 180)
// and down to (1480, 335)): fewer, broader feathers than before (n 7, fw 0.5)
const CARRY_W23 = [fanF(CARRY_PL, [1345, 292], 158, 232, 44, 136, 134, { seed: 3, n: 8, fw: 0.36, fpk: 0.95, cover: 40 }), fanF(CARRY_PL, [1440, 290], 30, -52, 46, 138, 134, { seed: 4, n: 8, fw: 0.36, fpk: 0.95, cover: 40 })];
const CARRY = mergePose(BASE, {
  // fix pass 1 (measured at 84.60): head centre (1380, 243) = (−43, −163), ~90 × 93 px; the body a squat pear under
  // it, 1345–1450 × to 348, the head sunk ~60 units into it (no waist)
  // fix pass 2 (2112): the head sits higher and turned further to our left (eyes (1310, 250) / (1345, 245)), the body
  // smaller (1290–1400 × 260–340), the legs showing under it
  head: { x: -58, y: -178, rx: 104, ry: 104, yaw: -0.62, roll: -0.05, square: 2.1 },
  body: { x: -6, y: -22, a: 74, b: 102, egg: -0.16 },
  headphones: { yaw: -0.62, far: false },
  eyes: { spread: 0.36, el: -0.3, look: [-0.75, 0.05], left: { state: "glossy" }, right: { state: "shut" } },
  brow: { left: { w: 1.0, slant: 0.5 }, right: { w: 1.1, slant: 0.2, dy: 0.25 } },
  bandage: { az: -0.22, el: 0.5, size: 62 },
  // (the measured fan version, CARRY_W23, covers ~40 % more white than the source's wings on 84.60–88.24; the band
  // wings with the web match its white area within ~4 %, so they stay)
  // fix pass 2: upright FANS from the shoulders (2112: left hinge (1325, 270), feathers from 190° (70 px) through the
  // longest at 214° (133 px, tip (1215, 195)) to 250° (85 px); right hinge (1418, 265), −10° (65) … −54° (110, tip
  // (1480, 180)) … −78° (80)): the band wings stuck out sideways and read as combs
  // (the wings flex on twos through the walk: 2112 has them higher (190–250°), 2129 lower (160–225°); one drawing
  // between the two)
  wings: [], w23: [fanF({ x: 1371, y: 312, s: 0.42 }, [1325, 270], 190, 250, 70, 133, 85, { n: 9, fpk: 0.42, fw: 0.4, cover: 48, hr: 14, seed: 3, rows: 2, bend: 0.16, soft: 1 }),
    fanF({ x: 1371, y: 312, s: 0.42 }, [1418, 265], -10, -78, 65, 110, 80, { n: 9, fpk: 0.45, fw: 0.4, cover: 48, hr: 14, seed: 4, rows: 2, bend: 0.16, soft: 1 })],
});
for (let i = 0; i < 4; i++) P["carry" + i] = mergePose(CARRY, { feet: CARRY_FEET[i] });
// 84.12–84.16 (2103–2104) only: the wings are still spread wide and low as it takes the strip's weight (from 2105 they
// are raised in the V): the 1b band wings, which fit this frame
P.carryOpen = mergePose(CARRY, { feet: CARRY_FEET[0], w23: bandPair([-114, -88], [-376, -302], [100, -88], [302, -314]) });
// both eyes squeezed (87.68–87.72), facing us
P.carrySq = mergePose(CARRY, { head: { x: -20, yaw: -0.1 }, headphones: { yaw: -0.1 }, eyes: { left: { state: "shut" }, right: { state: "shut" } }, brow: { w: 1.1, slant: 0.25, dy: 0.25 }, feet: CARRY_FEET[1] });
// facing us, both eyes open and glaring to our right (88.08–88.32)
P.carryF = mergePose(CARRY, { head: { x: -6, yaw: 0, roll: 0 }, headphones: { yaw: 0 }, eyes: { look: [0.55, 0], left: { state: "glossy" }, right: { state: "glossy" } }, brow: { w: 1.0, slant: 0.55 }, feet: CARRY_FEET[1] });
// lifting off with the strip, both eyes open (85.80–85.88)
// (lifting off and dropping in the wings are spread wide, not raised in the carry's V: the 1b band wings fit better)
P.lift = mergePose(CARRY, { w23: bandPair([-114, -88], [-376, -302], [100, -88], [302, -314]), head: { yaw: -0.3 }, headphones: { yaw: -0.3 }, eyes: { look: [-0.4, -0.1], left: { state: "glossy" }, right: { state: "glossy" } }, brow: { w: 1.0, slant: 0.55 },
  feet: [{ x: -30, y: 74, rot: 0.3, size: 26, mode: "dangle", toes: 3, spread: 0.5, claw: "dark", seed: 2 }, { x: 36, y: 74, rot: -0.2, size: 26, mode: "dangle", toes: 3, spread: 0.5, claw: "dark", seed: 5 }] });

// the hop off the banner (89.60–90.12): wings up in a V, looking down; from 89.96 the scissors hang from its right wing
const DANGLE = [{ x: -30, y: 70, rot: 0.2, size: 26, mode: "dangle", toes: 3, spread: 0.5, claw: "dark", seed: 2 }, { x: 34, y: 72, rot: -0.2, size: 26, mode: "dangle", toes: 3, spread: 0.5, claw: "dark", seed: 5 }];
// fit at 89.76: root (700, 255), s 0.40, head centre (703, 180), left fan hinge (655, 215) tips (560, 120)..(600, 240)
const HOP_PL = { x: 700, y: 255, s: 0.4 };
const HOP_W23 = [fanF(HOP_PL, [657, 218], 170, 232, 50, 120, 116, { seed: 5, n: 8, fw: 0.38, fpk: 0.95, cover: 40, rows: 2, bend: 0.14, soft: 1 }), fanF(HOP_PL, [750, 218], 10, -52, 50, 120, 118, { seed: 6, n: 8, fw: 0.38, fpk: 0.95, cover: 40, rows: 2, bend: 0.14, soft: 1 })];
const HOP_B = bandPair([-112, -100], [-350, -325], [125, -100], [350, -337]);
P.hopUp = mergePose(BASE, { head: { y: -150 }, body: { y: -10 }, eyes: { look: [-0.2, 0.6] }, feet: DANGLE, wings: [], w23: HOP_W23 });
P.land = mergePose(BASE, { head: { y: -150 }, body: { y: -10 }, eyes: { look: [0.2, 0.5] }, wings: [], w23: HOP_W23, scissors: "rightHang" });
P.spread = mergePose(P.press, { eyes: { look: [0.35, 0.6] }, scissors: "rightHang" });

// wiping its brow (90.44–91.64, fit at 90.80: head centre (693, 455), eyes shut, left wing across the forehead,
// right wing resting on the planted scissors' rings (745–775, 500–520), feet (660, 575) / (705, 570))
P.wipe = mergePose(TALL, {
  head: { x: -4, roll: -0.08, yaw: -0.08 }, headphones: { yaw: -0.08 },
  eyes: { state: "shut", look: [0, 0] }, brow: null, scissors: "planted",
  wings: [armW(-1, [-92, -60], [-150, -140], [-30, -205], { len: 36, fingers: [1, -0.25], nf: 4, fingerLen: 1.3, layer: "top" }), armW(1, [-92, -30], [-128, 16], [-128, -36], { len: 32, fingers: [0.2, -1], nf: 3 })],
  // feet at (660, 580) / (705, 575), toes to y ≈ 588 (90.80)
  feet: [FOOT(-72, 100, 0.25, 2), FOOT(26, 96, -0.1, 5)],
});
P.wipeUp = mergePose(P.wipe, { eyes: { state: "glossy", look: [-0.6, 0.5] }, brow: BASE.brow, wings: [armW(-1, [-92, -40], [-175, -60], [-205, -95], { len: 34, fingers: [-0.4, -1], nf: 4 }), P.wipe.wings[1]] });
P.wipeDown = mergePose(P.wipe, { wings: [armW(-1, [-92, -40], [-130, 20], [-96, 70], { len: 34, fingers: [0.3, 1], nf: 3 }), P.wipe.wings[1]] });

// crouched, fluffed, fists clenched at its sides, glaring (91.84–92.56, fit at 92.20: head centre (690, 490), cups at
// x ≈ 735, fists (615, 520) / (780, 520), feet ≈ 580)
// fix pass 1 (92.20): head centre (692, 485), body a fluffy ball 630–750 × to 575, big clenched feather fists at
// (615, 530) / (785, 530) with the elbows out (upper arms from the shoulders at (655, 500) / (740, 500)); drawn by
// fists() in owl units, not the kit's arm wings
P.crouch = mergePose(BASE, {
  head: { x: 0, y: -105, ry: 100, rx: 114, edge: { step: 20, depth: 9, lean: 0.8, from: 0.55, to: 0.97, seed: 3 } },
  body: { x: -2, a: 104, b: 136, y: 2, egg: -0.08, edge: { step: 24, depth: 11, lean: 0.9, from: 0.15, to: 0.85, seed: 5 } },
  eyes: { look: [0, 0.2], over: { iris: 0.5, lid: 0.42, droop: -0.7 } }, brow: { w: 1.35, slant: 0.75 },
  // fix pass 2 (2300, 2x crop): folded wings bent at the elbow — out from the shoulder (650, 495) / (745, 492) to the
  // elbow (607, 500) / (795, 497), the feathered fist tucked under it at (612, 530) / (788, 527) — not balls on tubes
  wings: [], fists: { S: [[-98, -81], [123, -88]], E: [[-205, -66], [222, -74]], F: [[-180, 2], [198, -5]], r: 36 },
  // (two empty "feet" at the fists only widen the kit's layer box so the fists are not cut off)
  feet: [FOOT(-44, 52, 0.3, 2), FOOT(60, 52, -0.3, 5), { x: -240, y: -90, size: 36, toes: 0, leg: 0 }, { x: 280, y: -100, size: 36, toes: 0, leg: 0 }],
});
// blank glowing eyes (the powered-up look): white eyes, no iris, a heavy angry lid line
const BLAZE = { state: "glossy", over: { sx: 1, iris: 0.001, lid: 0.3, droop: -0.8, catch: false } };
P.antic = mergePose(P.crouch, { outline: 0.12, eyes: BLAZE, beak: { open: 0.2 } });

const POWER_PL = { x: 690, y: 525, s: 0.47 };
// fix pass 1: fans from the shoulders (93.24: left from (638, 482) out to the tip (518, 385) at 218°, trailing
// feathers down to (560, 520) at 153°; right from (745, 472) to (878, 388) and down to (810, 520))
// fix pass 2 (2330, 2x crops): the source's raised wings are a narrow bundle of long pointed feathers overlapping in
// layers, the primaries up and out (left 205–224°, ~150 px; right −20…−37°), the secondaries shorter below them
// (left ≈ 180°, ~80 px; right ≈ 0°) — not a 72° comb. Tips: left ≈ (505, 395), right ≈ (882, 386).
const POWER_W23 = [fanF(POWER_PL, [640, 482], 182, 224, 78, 150, 146, { n: 10, seed: 15, fw: 0.3, fpk: 0.8, cover: 46, hr: 16, rows: 2, bend: 0.12, soft: 1 }), fanF(POWER_PL, [746, 472], 2, -37, 78, 152, 148, { n: 10, seed: 16, fw: 0.3, fpk: 0.8, cover: 46, hr: 16, rows: 2, bend: 0.12, soft: 1 })];
// powered up (92.64–95.56, fit at 93.20 / 95.40, s 0.52: head centre (690, 450), cups (632, 445) / (745, 440), wing
// tips (500, 395) / (885, 390), feet (645–765, 575–580)): wings flung up and out, beak open yelling, blank eyes
// fix pass 1 (93.24): head centre (685, 447), eyes big white ovals with dark rims, the beak wide open (upper beak
// 675–690 × 470–485, the dark mouth to 500), the body a pear leaning right (640–775 × to 575), feet (655, 578) /
// (755, 575) planted on the speaker
// fix pass 2 (2327, 2.5x crop): the head is turned a little to our left (eyes (655, 455) / (705, 452), the face ~15 px
// left of the 1b drawing), and it yells: upper mandible (675–690, 460–475) raised over a dark open mouth ≈ 17 × 28 px
// centred ≈ (682, 482)
// (fix pass 2, 2360: the body's bottom sits at ≈ 562 with short legs and small feet on the speaker at (650, 575) /
// (760, 575); the 1b pear reached 581 and covered the speaker's top; the contour was heavier than the source's)
P.power = mergePose(TALL, { outline: 0.1, outlineW: 1.5,
  head: { x: -40, y: -170, yaw: -0.16 }, headphones: { yaw: -0.16 }, body: { x: 16, y: -12, a: 96, b: 114 },
  eyes: { ...BLAZE, r: 29, spread: 0.31 }, brow: { w: 1.7, slant: 0.8 }, beak: { open: 0, w: 30, l: 30 }, yell: { open: 1, w: 44, l: 40, dy: 4 },
  wings: [], w23: POWER_W23,
  feet: [FOOT(-78, 70, 0.3, 2, { size: 22, leg: 10 }), FOOT(134, 68, -0.3, 5, { size: 22, leg: 10 })],
});
// reaching out to the left for the returning scissors (93.84–94.84), the right wing a fist at its chest
// (fix pass 2, 2360: the reaching wing is the same layered fan as the power-up's, from the shoulder (645, 495) out to
// the left — upper feathers to ≈ (500, 465) at 192°, the lowest hanging to ≈ (560, 560) at 143° — not the kit's comb)
P.reach = mergePose(P.power, {
  w23: [fanF(POWER_PL, [645, 495], 143, 196, 100, 150, 140, { n: 10, seed: 17, fw: 0.3, fpk: 0.75, cover: 46, hr: 16, rows: 2, bend: 0.12, soft: 1 })],
  head: { yaw: -0.15 }, headphones: { yaw: -0.15 }, yell: { open: 0.35, w: 30, l: 28 },
  wings: [armW(1, [-92, -30], [-150, 10], [-80, -10], { len: 40, fingers: [1, -0.3], nf: 3, fingerLen: 0.8 })],
});
// a pair of scissors held up in each wing (94.88–95.92, fit at 95.40: scissors at (595, 470) and (785, 450))
// fix 1b (95.40, root (693, 528), s 0.475): the left pair's rings at (598, 490) in the left hand, its blades up and out
// to the tip at (550, 400); the right pair held higher, rings at (788, 452), blades up and in to (752, 378)
const TWO_SC = [{ x: -235, y: -145, ang: -2.06, L: 141 }, { x: 174, y: -214, ang: -2.02, L: 114 }];
P.two = mergePose(P.power, {
  w23: [], yell: null, head: { yaw: 0 }, headphones: { yaw: 0 },
  wings: [armW(-1, [-92, -40], [-175, -10], [-215, -85], { len: 34, fingers: [0, -1], nf: 3, fingerLen: 0.9 }), armW(1, [-92, -40], [-165, -70], [-205, -150], { len: 34, fingers: [0, -1], nf: 3, fingerLen: 0.9 })],
  scissors: TWO_SC,
});
// zipping round the page (95.96–97.04, fit at 96.00 / 96.84: s 0.55): the two pairs held up, glaring (not blank)
P.zipTwo = mergePose(P.two, { outline: null, fur: 0, head: { yaw: 0.35 }, headphones: { yaw: 0.35, far: false }, eyes: { state: "glossy", over: { sx: 1, iris: 0.62, lid: 0.32, droop: -0.6, catch: true }, look: [0.3, 0.3] }, brow: { w: 1.1, slant: 0.6 }, feet: DANGLE });
// both pairs thrust forward like lances, flying right (96.80–96.92)
P.zipLance = mergePose(P.zipTwo, {
  head: { yaw: 0.25, roll: 0.05 }, headphones: { yaw: 0.25 }, eyes: { look: [0.6, 0.2] },
  wings: [armW(-1, [-92, -30], [-60, 60], [80, 70], { len: 34, fingers: [1, 0], nf: 3, fingerLen: 0.8, layer: "top" }), armW(1, [-92, -30], [-150, 30], [-210, 60], { len: 34, fingers: [-1, 0.2], nf: 3, fingerLen: 0.8 })],
  scissors: "lance",
});
// fix pass 2: the zip's held drawings. The source alternates TWO drawings on ones at every stop (2399–2407, 2409–10,
// 2412–15, 2417–18, 2420–23): A = flying, head 3/4 to our left and glaring, the left pair raised in its left wing
// (pivot ≈ 120 px left of the body, blades up), the right pair raised behind its head (blades up and in), feet
// dangling at the back; B = lunging left, both pairs thrust forward (blades pointing left, horizontal), the right wing
// swept back, feet trailing. Measured on 2403 (A) / 2404 (B), 2x crops, root = body centre (445, 160) / (455, 165),
// s 0.475: A head centre (410, 95), eyes (377, 112) / (412, 115), beak (405, 132), right cup (452–480, 70–100),
// left pair pivot (318, 110) tips ≈ (295, 28), right pair pivot (505, 30) tips up-left past the frame top, body
// 360–535 × 110–200, feet (465, 222) / (540, 200); B head (420, 95), pairs' pivots (330, 200) / (375, 215) pointing
// left to x ≈ 240, the right wing's tip ≈ (560, 150), feet (460, 228) / (545, 205). Crisp ink (no powered-up glow).
const ZIP_BASE = mergePose(TALL, {
  outline: null, fur: 1,
  head: { x: -46, y: -150, rx: 110, ry: 102, yaw: -0.28, roll: -0.06 }, headphones: { yaw: -0.28, far: true },
  body: { x: 16, y: -18, a: 170, b: 72, rot: 0.38, egg: -0.12 },
  eyes: { state: "glossy", r: 25, spread: 0.34, over: { sx: 1, iris: 0.6, lid: 0.34, droop: -0.6, catch: true }, look: [-0.6, 0.2] },
  brow: { w: 1.3, slant: 0.75 }, beak: { open: 0.25, w: 26, l: 28 },
  tail: { base: [170, 0], tip: [240, -20], w: 20, n: 3 },
});
P.zipA = mergePose(ZIP_BASE, {
  wings: [armW(-1, [-110, -40], [-190, -20], [-255, -80], { len: 50, fingers: [-0.3, -1], nf: 4, fingerLen: 1.0 }),
    armW(1, [-40, -80], [-120, -150], [-150, -230], { len: 60, fingers: [0.5, -1], nf: 5, fingerLen: 1.3, layer: "back" })],
  scissors: [{ x: -272, y: -178, ang: -1.82, L: 168 }, { x: 101, y: -301, ang: -2.05, L: 147 }],
  feet: [{ x: 38, y: 78, rot: 0.5, size: 26, mode: "dangle", toes: 3, spread: 0.5, claw: "dark", seed: 2 }, { x: 185, y: 52, rot: 0.8, size: 24, mode: "dangle", toes: 3, spread: 0.5, claw: "dark", seed: 5 },
    { x: -320, y: -330, size: 30, toes: 0, leg: 0 }, { x: 60, y: -400, size: 30, toes: 0, leg: 0 }],
});
P.zipB = mergePose(ZIP_BASE, {
  head: { x: -36, y: -150 }, body: { x: 6, y: 6, rot: 0.55 },
  wings: [armW(-1, [-110, 0], [-170, 40], [-225, 57], { len: 38, fingers: [-1, 0.1], nf: 4, fingerLen: 1.0, layer: "top" }),
    armW(1, [-40, 30], [-90, 90], [-131, 109], { len: 34, fingers: [-1, 0.2], nf: 3, fingerLen: 0.9, layer: "top" }),
    spreadW(1, [-60, -40], [-150, -60], [-240, -10], { trail: [-0.9, 0.3], len: 90, secLen: 1.2, n: 7, m: 5 })],
  scissors: [{ x: -285, y: 52, ang: Math.PI - 0.1, L: 128 }, { x: -195, y: 90, ang: Math.PI - 0.02, L: 140 }],
  tail: { base: [160, 50], tip: [235, 40], w: 20, n: 3 },
  feet: [{ x: 27, y: 99, rot: 1.0, size: 26, mode: "dangle", toes: 3, spread: 0.5, claw: "dark", seed: 2 }, { x: 196, y: 67, rot: 1.2, size: 24, mode: "dangle", toes: 3, spread: 0.5, claw: "dark", seed: 5 },
    { x: -460, y: 60, size: 30, toes: 0, leg: 0 }, { x: -380, y: 110, size: 30, toes: 0, leg: 0 }],
});
// flying with the scissors (95.96–97.04)
P.fly = mergePose(BASE, {
  head: { yaw: -0.3, roll: -0.15 }, headphones: { yaw: -0.3 }, eyes: BLAZE, beak: { open: 0.2 },
  wings: [], w23: HOP_B, feet: DANGLE, scissors: "two",
});
// hugging the peeled strip's end (84.04–84.08): head over the card's top edge, tilted, eyes squeezed shut; its body is
// behind the card and one wing wraps over the card's end (HUG_WING, drawn by s23.js after the card)
P.hug = mergePose(BASE, { head: { roll: -0.55, yaw: -0.3 }, headphones: { yaw: -0.3, far: false }, eyes: { state: "shut" }, brow: { w: 1.1, slant: 0.2, dy: 0.25 } });
export const HUG_WING = FW([0, 0], 96, 176, 150, 190, 150, { n: 8, fpk: 0.45, hr: 14, cover: 70, back: 14, fw: 0.46, seed: 9 });
export const POSES23 = P;

// ---------------------------------------------------------------- scissors in its wings (owl units)
function holdProps(g, geo, which) {
  if (!which) return;
  const W = geo.wings;
  if (which === "rightHang") {
    drawScissorsU(g, { x: 128, y: 30, ang: Math.PI / 2 + 0.12, L: 150, open: 0.08 });
  }
  if (which === "planted") {
    drawScissorsU(g, { x: 162, y: 44, ang: Math.PI / 2 + 0.05, L: 104, open: 0.06 });
  }
  if (which === "lance") {
    drawScissorsU(g, { x: 150, y: 70, ang: 0.05, L: 170, open: 0.08 });
  }
  // explicit pairs in owl units ({ x, y, ang, L } = pivot, blade direction, pivot -> tip)
  if (Array.isArray(which)) for (const q of which) drawScissorsU(g, { open: 0.1, ...q });
  if (which === "two") {
    for (const w of W) if (w && w.T) drawScissorsU(g, { x: w.T[0], y: w.T[1] - 40, ang: -Math.PI / 2 + (w.T[0] < 0 ? -0.12 : 0.12), L: 150, open: 0.1, ring: true });
  }
}

// ---------------------------------------------------------------- fix pass 1: fur, fists, the yelling beak
// Feather texture on the body (the source's owl is engraved: fine grey ticks and scallops, heavier low down and at the
// sides, the chest nearly clean). Painted on a scratch canvas clipped to the body, the head / face and the front arm
// wings erased from it, then laid over the kit's owl. ppu = canvas px per owl unit.
let FUR = null;
function fur(g, geo, pose, ppu) {
  const b = pose.body;
  if (!b || pose.fur === 0 || ppu * 1 < 0.2) return;
  const cv = g.canvas;
  if (!FUR) FUR = document.createElement("canvas");
  if (FUR.width !== cv.width || FUR.height !== cv.height) { FUR.width = cv.width; FUR.height = cv.height; }
  const f = FUR.getContext("2d");
  f.setTransform(1, 0, 0, 1, 0, 0); f.clearRect(0, 0, FUR.width, FUR.height); f.globalCompositeOperation = "source-over";
  f.setTransform(g.getTransform());
  const out = bodyOutline(b), cx = b.x || 0, cy = b.y || 0, A = b.a, B = b.b, px = 1 / ppu;
  f.save(); f.beginPath(); out.forEach((p, i) => (i ? f.lineTo(p[0], p[1]) : f.moveTo(p[0], p[1]))); f.closePath(); f.clip();
  // soft shading low down and at the sides (the body turns away from the light)
  const sh = f.createRadialGradient(cx - B * 0.25, cy - A * 0.35, A * 0.3, cx, cy, Math.max(A, B) * 1.15);
  sh.addColorStop(0, "rgba(120,120,116,0)"); sh.addColorStop(0.6, "rgba(120,120,116,0.08)"); sh.addColorStop(1, "rgba(90,90,86,0.34)");
  f.fillStyle = sh; f.fillRect(cx - B * 1.3, cy - A * 1.3, B * 2.6, A * 2.6);
  // rows of feather scallops (small u-ticks), staggered, following the body's round
  const r = mulberry(771 + Math.round(A + B));
  f.lineCap = "round";
  const stepY = 15, stepX = 17;
  for (let row = 0, y = cy - A * 0.95; y < cy + A * 1.05; y += stepY, row++) {
    for (let x = cx - B * 1.1 + (row % 2) * stepX * 0.5; x < cx + B * 1.1; x += stepX) {
      const u = (x - cx) / B, v = (y - cy) / A, rr = u * u + v * v;
      if (rr > 1.05) continue;
      const low = Math.max(0, v), side = Math.abs(u);
      const a = 0.04 + 0.3 * low + 0.22 * side * side + 0.08 * r();
      if (r() < 0.35 + 0.3 * (1 - low)) continue;
      const w = 4 + 4 * r(), dep = 2 + 3 * r(), jx = (r() - 0.5) * 9, jy = (r() - 0.5) * 7, tilt = u * 0.6 + (r() - 0.5) * 0.5;
      f.save(); f.translate(x + jx, y + jy); f.rotate(tilt);
      f.strokeStyle = `rgba(92,92,88,${Math.min(0.45, a)})`; f.lineWidth = px * (0.7 + 0.4 * low);
      f.beginPath();
      if (r() < 0.5) { f.moveTo(-w, -dep * 0.4); f.quadraticCurveTo(0, dep * 1.6, w * (0.4 + 0.6 * r()), -dep * 0.4); }
      else { f.moveTo(-w * 0.3, -dep); f.quadraticCurveTo(w * 0.1, 0, w * 0.1 * (r() - 0.5), dep * 1.5); }
      f.stroke();
      f.restore();
    }
  }
  f.restore();
  // erase the head (the face stays clean) and the arm wings in front of the body
  f.globalCompositeOperation = "destination-out";
  f.beginPath(); geo.H.out.forEach((p, i) => (i ? f.lineTo(p[0], p[1]) : f.moveTo(p[0], p[1]))); f.closePath(); f.fillStyle = "#000"; f.fill();
  f.lineCap = "round"; f.lineJoin = "round";
  for (const w of pose.wings || []) {
    if (w.type !== "arm" || w.layer === "back") continue;
    f.lineWidth = (w.len ?? 34) * 2.1; f.strokeStyle = "#000";
    f.beginPath(); f.moveTo(w.S[0], w.S[1]); f.lineTo(w.Wr[0], w.Wr[1]); f.lineTo(w.T[0], w.T[1]); f.stroke();
  }
  if (pose.fists) for (let i = 0; i < 2; i++) {
    const S = pose.fists.S[i], F = pose.fists.F[i], E = pose.fists.E ? pose.fists.E[i] : F; f.lineWidth = pose.fists.r * 1.6;
    f.beginPath(); f.moveTo(S[0], S[1]); f.lineTo(E[0], E[1]); f.lineTo(F[0], F[1]); f.stroke();
  }
  f.globalCompositeOperation = "source-over";
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(FUR, 0, 0); g.restore();
}
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// clenched feather fists on folded wings (crouch, 92.20; fix pass 2): each wing is a thick soft limb from the
// shoulder out to the elbow and down to the fist (a polyline S -> E -> F offset to a band 1.4–1.1 r wide), its lower /
// outer edge broken into hanging feather tips, the top edge a fine dark line; the fist a feathered clump at F with
// three knuckle creases and a dark rim. px = one frame px in units
function fists(g, o, px) {
  const r0 = o.r;
  g.save(); g.lineJoin = "round"; g.lineCap = "round";
  for (let i = 0; i < 2; i++) {
    const S = o.S[i], F = o.F[i], E = o.E ? o.E[i] : [(S[0] + F[0]) / 2, Math.min(S[1], F[1]) - 26], sd = F[0] < S[0] ? -1 : 1;
    // the limb's centre line: S -> E (a slight upward bow) -> F
    const line = [];
    for (let k = 0; k <= 12; k++) { const u = k / 12; line.push([S[0] + (E[0] - S[0]) * u, S[1] + (E[1] - S[1]) * u - 6 * Math.sin(Math.PI * u)]); }
    for (let k = 1; k <= 8; k++) { const u = k / 8; line.push([E[0] + (F[0] - E[0]) * u + sd * 8 * Math.sin(Math.PI * u), E[1] + (F[1] - E[1]) * u]); }
    const n = line.length, W = (k) => r0 * (0.72 - 0.16 * k / (n - 1));
    const top = [], bot = [];
    for (let k = 0; k < n; k++) {
      const p = line[k], q = line[Math.min(n - 1, k + 1)], p0 = line[Math.max(0, k - 1)];
      const t = [q[0] - p0[0], q[1] - p0[1]], tl = Math.hypot(t[0], t[1]) || 1, nn = [-t[1] / tl, t[0] / tl], w = W(k);
      top.push([p[0] + nn[0] * w, p[1] + nn[1] * w]); bot.push([p[0] - nn[0] * w, p[1] - nn[1] * w]);
    }
    // which side is "outer/lower": the side facing down (+y) on the horizontal run
    const lowIsTop = top[3][1] > bot[3][1], low = lowIsTop ? top : bot, up = lowIsTop ? bot : top;
    // serrate the lower edge into hanging feather tips
    const serr = [];
    for (let k = 0; k < n - 1; k++) {
      const a = low[k], b = low[k + 1], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      serr.push(a, [m[0] - sd * 3, m[1] + 9]);
    }
    serr.push(low[n - 1]);
    g.beginPath(); up.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); for (let k = serr.length - 1; k >= 0; k--) g.lineTo(serr[k][0], serr[k][1]); g.closePath();
    g.fillStyle = gv(0.95); g.fill();
    g.strokeStyle = gv(0.3, 0.7); g.lineWidth = px * 1.1; g.stroke();
    g.beginPath(); up.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.strokeStyle = gv(0.14, 0.9); g.lineWidth = px * 1.7; g.stroke();
    // covert scallops along the limb
    g.strokeStyle = gv(0.42, 0.6); g.lineWidth = px * 1.0;
    for (let k = 2; k < n - 3; k += 3) {
      const p = line[k], w = W(k) * 0.6;
      g.beginPath(); g.arc(p[0], p[1] + w * 0.2, w, 0.3, Math.PI - 0.3); g.stroke();
    }
    // the fist
    g.save(); g.translate(F[0], F[1] + r0 * 0.25);
    g.beginPath();
    for (let a = 0; a <= 24; a++) { const t = (a / 24) * Math.PI * 2, rr = r0 * (0.95 + 0.07 * Math.sin(t * 5 + i)); a ? g.lineTo(Math.cos(t) * rr, Math.sin(t) * rr * 0.9) : g.moveTo(Math.cos(t) * rr, Math.sin(t) * rr * 0.9); }
    g.closePath(); g.fillStyle = gv(0.96); g.fill(); g.strokeStyle = gv(0.12, 0.95); g.lineWidth = px * 1.8; g.stroke();
    g.strokeStyle = gv(0.25, 0.85); g.lineWidth = px * 1.3;
    for (let k = -1; k <= 1; k++) {
      g.beginPath(); g.arc(sd * r0 * 0.25, k * r0 * 0.36, r0 * 0.5, sd > 0 ? -0.6 : Math.PI - 0.8, sd > 0 ? 0.8 : Math.PI + 0.6); g.stroke();
    }
    g.beginPath(); g.moveTo(-sd * r0 * 0.7, -r0 * 0.5); g.quadraticCurveTo(-sd * r0 * 0.2, -r0 * 0.2, -sd * r0 * 0.1, r0 * 0.4); g.stroke();
    g.restore();
  }
  g.restore();
}
// the yelling beak (power-up): a pale hooked upper beak over a dark open mouth (93.24: ~15 × 15 px + a 8 × 15 px mouth)
function yell(g, geo, o) {
  const b = geo.beak, H = geo.H, w = o.w ?? 34, l = o.l ?? 30, open = o.open ?? 1;
  g.save(); g.translate(b.x, b.y - l * 0.3 + (o.dy ?? 0)); g.rotate(H.roll || 0);
  // mouth
  g.beginPath(); g.ellipse(0, l * 0.62, w * 0.3, l * 0.62 * open + 2, 0, 0, Math.PI * 2);
  g.fillStyle = gv(0.1); g.fill();
  g.beginPath(); g.ellipse(0, l * 0.62 + l * 0.35 * open, w * 0.18, l * 0.18 * open, 0, 0, Math.PI * 2); g.fillStyle = gv(0.34); g.fill();
  // the lower beak rim under the mouth
  g.beginPath(); g.moveTo(-w * 0.3, l * 0.62 + l * 0.3 * open); g.quadraticCurveTo(0, l * 0.62 + l * 0.85 * open + 4, w * 0.3, l * 0.62 + l * 0.3 * open);
  g.strokeStyle = gv(0.15); g.lineWidth = 3; g.stroke();
  // upper beak
  g.beginPath(); g.moveTo(-w * 0.5, 0); g.quadraticCurveTo(-w * 0.45, -l * 0.35, 0, -l * 0.4); g.quadraticCurveTo(w * 0.45, -l * 0.35, w * 0.5, 0);
  g.quadraticCurveTo(w * 0.2, l * 0.35, 0, l * 0.62); g.quadraticCurveTo(-w * 0.2, l * 0.35, -w * 0.5, 0); g.closePath();
  g.fillStyle = gv(0.9); g.fill(); g.strokeStyle = gv(0.1); g.lineWidth = 3.2; g.stroke();
  g.restore();
}

// ---------------------------------------------------------------- layers
const CACHE = new Map();
// A finished owl layer ({ canvas, x, y, w, h, anchors }, frame px): the kit's owl, with this shot's own fan / band
// wings (pose.w23, owl units) painted behind it (or in front: w.front). key caches it (held drawings); `props(g, geo)`
// draws in owl units on top of the kit owl.
export function birdLayer(pose, place, o = {}) {
  const { key = null } = o;
  if (key && CACHE.has(key)) return CACHE.get(key);
  let L = birdLayer0(pose, place, o);
  if (pose.outline != null) L = outlined(L, pose.outline, pose.outlineW ?? 1.6);
  if (key) CACHE.set(key, L);
  return L;
}
// an ink contour round the whole silhouette (the powered-up owl reads as line art against the white aura)
function outlined(L, v, w) {
  const c = document.createElement("canvas"); c.width = L.canvas.width + 8; c.height = L.canvas.height + 8;
  const g = c.getContext("2d");
  const dk = document.createElement("canvas"); dk.width = L.canvas.width; dk.height = L.canvas.height;
  const d = dk.getContext("2d"); d.drawImage(L.canvas, 0, 0); d.globalCompositeOperation = "source-in"; d.fillStyle = gv(v); d.fillRect(0, 0, dk.width, dk.height);
  const k = L.canvas.width / L.w;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.drawImage(dk, 4 + Math.cos(a) * w * k, 4 + Math.sin(a) * w * k); }
  g.drawImage(L.canvas, 4, 4);
  return { canvas: c, x: L.x - 4 / k, y: L.y - 4 / k, w: L.w + 8 / k, h: L.h + 8 / k, anchors: L.anchors };
}
function birdLayer0(pose, place, { props = null, res = 1, tone = true } = {}) {
  // wings on layer "top" are painted over the face (the wing wiping its brow)
  const top = (pose.wings || []).filter((w) => w.layer === "top");
  const extra = (g, geo) => {
    fur(g, geo, pose, place.s * res);
    if (pose.fists) fists(g, pose.fists, 1 / (place.s * res));
    if (pose.yell) yell(g, geo, pose.yell);
    brows(g, geo, pose.brow);
    darkCups(g, geo, pose.headphones);
    for (const w of top) drawWing(g, { ...w, layer: "front" }, { light: pose.light });
    holdProps(g, geo, pose.scissors); if (props) props(g, geo);
  };
  const K = owlLayer({ ...pose, wings: (pose.wings || []).filter((w) => w.layer !== "top"), ...place, res, tone, extra });
  const ws = pose.w23 || [];
  if (!ws.length) return K;
  const { x, y, s } = place, rot = place.rot || 0, fl = place.flip ? -1 : 1, co = Math.cos(rot), sn = Math.sin(rot);
  let x0 = K.x, y0 = K.y, x1 = K.x + K.w, y1 = K.y + K.h;
  for (const w of ws) for (const p of wingPts(w)) {
    const fx = x + s * (co * fl * p[0] - sn * p[1]), fy = y + s * (sn * fl * p[0] + co * p[1]);
    x0 = Math.min(x0, fx); y0 = Math.min(y0, fy); x1 = Math.max(x1, fx); y1 = Math.max(y1, fy);
  }
  x0 = Math.floor(x0 - 6); y0 = Math.floor(y0 - 6); x1 = Math.ceil(x1 + 6); y1 = Math.ceil(y1 + 6);
  const c = document.createElement("canvas"); c.width = Math.round((x1 - x0) * res); c.height = Math.round((y1 - y0) * res);
  const g = c.getContext("2d");
  const unitT = () => g.setTransform(res * s * fl * co, res * s * fl * sn, -res * s * sn, res * s * co, res * (x - x0), res * (y - y0));
  const paint = (list) => { if (!list.length) return; g.save(); unitT(); for (const w of list) paintWing23(g, w, 1 / s, pose.wingTone ?? 1); g.restore(); };
  paint(ws.filter((w) => !w.front));
  g.drawImage(K.canvas, (K.x - x0) * res, (K.y - y0) * res, K.w * res, K.h * res);
  paint(ws.filter((w) => w.front));
  return { canvas: c, x: x0, y: y0, w: x1 - x0, h: y1 - y0, anchors: K.anchors };
}
export function drawLayer(ctx, L, { alpha = 1, dx = 0, dy = 0, m = null } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (m) ctx.transform(...m);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(L.canvas, L.x + dx, L.y + dy, L.w, L.h);
  ctx.restore();
}
export function releaseBirds() { CACHE.clear(); }
