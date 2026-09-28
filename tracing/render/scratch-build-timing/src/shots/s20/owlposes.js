// s20 owl poses for the owl2 rig (units = frame px at s = 1; root = body centre). Measured on the source frames
// (grids in snapshots/s20-fix1-ref): see fidelity/s20.md.
function merge(a, b) {
  if (!b) return a;
  const out = { ...a };
  for (const k of Object.keys(b)) {
    const v = b[k];
    out[k] = v && typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object" && !Array.isArray(a[k]) ? merge(a[k], v) : v;
  }
  return out;
}
export { merge };

// ---------------------------------------------------------------- front, standing (63.80–64.28), measured at 64.12:
// head centre (1166,535) rx 89 ry 82 (crown 453), eyes (1123,535)/(1203,535) r 23.5, pupils 0.39 r, beak top
// (1162,551) tip 582, cups (1059,542)/(1275,540) R 45, band apex 430, body to x 1250 and y 748, wing (1022–1110,
// 600–720), tail to (995,725), feet (1100,795)/(1200,780). Placement root (1150,660) s 1.
export const FRONT = (o) => merge({
  head: { x: 16, y: -125, rx: 89, ry: 81, yaw: 0, roll: 0.0, pitch: 0, sq: 2.15 },
  body: { x: 8, y: 2, rx: 110, ry: 90, rot: 0, egg: 0.02, sqLow: 2.1 },
  shade: 0.8,
  k: 60,
  tufts: [{ phi: -0.98, size: 34, lean: -0.25, w: 1.2 }, { phi: 0.98, size: 32, lean: 0.25, w: 1.2 }],
  eyes: { az: 0.46, el: 0.0, r: 23.5, pupil: 0.39, look: [-0.8, -0.05], brow: { lift: -0.1, tilt: -0.5, len: 1.15, color: 'rgba(80,80,80,0.8)', w: 1.3 } },
  beak: { el: -0.2, w: 26, l: 31 },
  bandS: [-22, -63, 46, 0.62, 1, 0.82, 1.5],
  hp: { r: 44, T: 30, cx: 1.02, bx: 1.3, dy: 0.08, apex: 1.3, depth: 22, thick: 7 },
  wings: [{ type: "folded", S: [-42, -66], T: [-124, 50], w: 60, side: 1, n: 4, bold: "inner", rows: 3, tipFrom: 0.6, pow: 0.6, innerBow: 0.5 }],
  tail: { base: [-80, 52], tip: [-155, 66], w: 22, n: 3, fan: 0.5 },
  feet: [{ x: -50, y: 130, dir: 1.8, size: 30, leg: 22, flat: 0.6, spread: 0.62, w: 0.21 }, { x: 30, y: 114, dir: 0.3, size: 30, leg: 18, flat: 0.45, spread: 0.55, w: 0.21 }],
  chestA: 0.16,
  sweat: null,
  light: [-0.55, -0.83],
}, o);

export const POSE = {
  front: () => FRONT({ sweat: [-76, 15] }),
};

// ---------------------------------------------------------------- profile facing left (64.36–67.16), measured at
// 66.00: head (1025–1220, top 440) centre (1122,525), eye (1060,527) r 25, beak base (1030,537) tip (1003,558),
// cup (1149,550) R 45, band up to y 405, tufts at the back (1240,478)/(1255,530), body to x 1260 and y 780,
// wing S (1175,600) → tip (1300,762) with its bold front edge, tail to (1330,768), feet (1080,812)/(1165,835).
// Placement root (1145,680) s 1.09.
export const SIDE = (o) => merge({
  head: { x: -21, y: -142, rx: 89, ry: 80, yaw: -1.29, roll: 0.0, pitch: 0, sq: 2.2 },
  body: { x: 12, y: 4, rx: 100, ry: 98, rot: 0, egg: 0.02, sqLow: 2.0 },
  shade: 0.8,
  k: 60,
  tufts: [{ phi: 1.18, size: 56, lean: 0.55, w: 1.3 }, { phi: 1.75, size: 44, lean: 0.35, w: 1.2 }],
  eyes: { az: 0.68, el: 0.0, r: 23, pupil: 0.4, look: [-0.75, -0.1], brow: { lift: -0.08, tilt: -0.2, len: 0.9, color: "rgba(80,80,80,0.8)", w: 1.3 } },
  beak: { profile: true, el: -0.14, dir: -1, l: 27, h: 32, dx: 4, dy: 4 },
  bandS: [-6, -54, 44, -1.0, 0.62, 1, 0.25],
  hp: { r: 41, T: 30, cx: 1.02, bx: 1.25, dy: 0.3, apex: 1.36, depth: 28, thick: 8, bandYaw: -1.57 },
  wings: [{ type: "folded", S: [14, -69], T: [147, 75], w: 66, side: 1, n: 5, bold: "outer", rows: 3, tipFrom: 0.55, pow: 0.75, innerBow: 0.1 }],
  tail: { base: [88, 45], tip: [172, 80], w: 24, n: 3, fan: 0.5 },
  feet: [{ x: -58, y: 122, dir: 2.8, size: 30, leg: 5, flat: 0.35, spread: 0.5, w: 0.21 }, { x: 18, y: 142, dir: 2.9, size: 30, leg: 5, flat: 0.35, spread: 0.5, w: 0.21 }],
  chestA: 0.14, chestFrom: 0.8,
  light: [-0.55, -0.83],
}, o);
POSE.side = () => SIDE();

// ---------------------------------------------------------------- rear three-quarter (63.12–63.64), measured at
// 63.20: left cup (1122–1150, 505–580) edge-on behind the head, right cup centre (1300,550) R 45 plate visible, band
// apex 428, crown ≈ 457, bandage (1245,520), body 1112–1300 at y 650 and down to 765, the raised right wing fanned
// against the card (tips 1335,505 … 1330,716), tail to (1085,755), feet (1160,792)/(1232,812).
// Placement root ≈ (1205,670) s 1.05 (x slides with the card, per frame).
export const REAR = (o) => merge({
  head: { x: 12, y: -118, rx: 88, ry: 82, yaw: 2.4, roll: 0.03, pitch: 0, sq: 2.3 },
  body: { x: 4, y: 4, rx: 90, ry: 94, rot: 0, egg: 0.0, sqLow: 2.0 },
  shade: 0.78,
  k: 60,
  tufts: [{ phi: -1.3, size: 30, lean: -0.5, w: 1.2 }, { phi: -0.35, size: 14, lean: -0.3, w: 1.0 }, { phi: 0.25, size: 12, lean: 0.3, w: 1.0 }],
  eyes: { hidden: true },
  beak: { hidden: true },
  bandS: [30, -40, 46, 0.7, 0.8, 0.9, 1.45],
  hp: { r: 43, T: 30, cx: 1.02, bx: 1.3, dy: 0.06, apex: 1.4, depth: 22, thick: 8, cupOv: { 1: { az: -0.1, T: 22 } } },
  wings: [{ type: "fan", lead: [[48, -24], [90, -86], [114, -143]], tips: [[124, -157], [155, -124], [174, -81], [178, -36], [163, 10], [119, 44]], fw: 20, cov: 0.34, reach: 0.95, notch: 0.3 }],
  tail: { base: [-30, 60], tip: [-116, 80], w: 26, n: 3, fan: 0.9 },
  feet: [{ x: -43, y: 118, dir: 2.7, size: 28, leg: 5, flat: 0.4, spread: 0.5, w: 0.22 }, { x: 26, y: 136, dir: 1.2, size: 28, leg: 5, flat: 0.3, spread: 0.5, w: 0.22 }],
  chestA: 0, furN: 190, chest: false,
}, o);
POSE.rear = () => REAR();

// ---------------------------------------------------------------- at the scissors (64.40–65.56): profile facing
// left, head pitched into the effort, eyes squeezed shut, the near wing beating forward at the blades.
// Measured at 65.00–65.08: head centre ≈ (945,540), cup (985,552) R 45, band up to 410, tufts at the back
// (1035,480)/(1050,525), body centre (960,680) bottom 800, tail to (1195,712), feet (960,815)/(1060,832).
// Placement root (960,680) s 1.09. Wing keys (units): high 65.00, mid 65.04, low 65.08.
export const FLAP_WINGS = {
  high: { rootLine: [[-69, -119], [-23, 0]], lead: [[-69, -119], [-150, -140], [-239, -149]], tips: [[-239, -149], [-216, -103], [-174, -62], [-133, -37], [-92, -14], [-55, 0]] },
  mid: { rootLine: [[-69, -101], [-28, 9]], lead: [[-69, -101], [-140, -100], [-216, -100]], tips: [[-216, -99], [-209, -72], [-176, -32], [-145, -6], [-108, 9], [-69, 17]] },
  low: { rootLine: [[-69, -64], [-28, 28]], lead: [[-69, -64], [-140, -45], [-208, -28]], tips: [[-208, -28], [-194, -2], [-158, 14], [-119, 23], [-78, 26], [-41, 20]] },
};
// placement root (980,690) s 1.09
export const FLAP = (k = "mid", o) => merge(SIDE({
  head: { x: -34, y: -140, rx: 80, ry: 80, yaw: -1.15, pitch: -0.2, roll: -0.05 },
  body: { x: 0, y: 0, rx: 100, ry: 100, rot: 0.05 },
  tufts: [{ phi: 1.1, size: 34, lean: 0.45, w: 1.5, spikes: [[0, 1, 0.12], [0.15, 0.7, 0.1], [-0.13, 0.55, 0.08]] }, { phi: 1.5, size: 30, lean: 0.3, w: 1.4, spikes: [[0, 1, 0.12], [0.14, 0.6, 0.09]] }],
  eyes: { az: 0.82, el: -0.17, closed: "squint", r: 22 },
  beak: { profile: true, az: 0.0, el: -0.2, dir: -1, l: 24, h: 26, dx: 42, dy: 34 },
  bandS: [-40, -56, 40, -0.9, 0.62, 1, 0.25],
  hp: { dy: 0.1, bandYaw: -1.57, bandDx: 34 },
  wings: [{ type: "fan", ...FLAP_WINGS[k], fw: 30, cov: 0.16, notch: 0.05 }],
  tail: { base: [80, 20], tip: [197, 20], w: 26, n: 3, fan: 0.6 },
  feet: [{ x: -40, y: 116, dir: 2.8, size: 30, leg: 2, flat: 0.35, spread: 0.5, w: 0.21 }, { x: 66, y: 136, dir: 2.9, size: 30, leg: 2, flat: 0.35, spread: 0.5, w: 0.21 }],
}), o);
POSE.flapHigh = () => FLAP("high");
POSE.flapMid = () => FLAP("mid");
POSE.flapLow = () => FLAP("low");

// ---------------------------------------------------------------- turning round (63.68–63.80), measured on the frames
// 63.68: rear three-quarter to the right, near cup (1250,545), right wing out to the right (tips x ≈ 1400);
// 63.72: profile to the right, eyes shut, beak (1320,560), cup (1195,550), wing flung out horizontally;
// 63.76: three-quarter right, eyes (1222,548)/(1275,545), cup plate (1128,525); 63.80: front, glancing right.
export const TURN1 = (o) => merge(REAR({
  head: { x: 14, y: -120, yaw: 1.9, roll: 0.0 },
  tufts: [{ phi: -1.25, size: 30, lean: -0.5, w: 1.2 }, { phi: -0.4, size: 12, lean: -0.3, w: 1.0 }],
  bandS: [58, -40, 44, 0.9, 0.55, 0.9, 0.35],
  hp: { cupOv: {} },
  wings: [{ type: "fan", rootLine: [[52, -76], [43, 0]], lead: [[52, -76], [120, -88], [186, -90]], tips: [[186, -90], [190, -62], [181, -33], [157, -10], [124, 10]], fw: 26, cov: 0.2, notch: 0.05 }],
}), o);
export const TURN2 = (o) => merge(SIDE({
  head: { x: 29, y: -133, yaw: 1.2 },
  body: { x: 0, y: 0, rx: 92, ry: 94 },
  tufts: [{ phi: -1.15, size: 40, lean: -0.5, w: 1.3 }, { phi: -1.7, size: 30, lean: -0.35, w: 1.2 }],
  eyes: { az: 0.6, closed: "squint", r: 22 },
  beak: { profile: true, el: -0.14, dir: 1, l: 26, h: 30, dx: -4, dy: 4 },
  bandS: [8, -54, 44, 1.0, 0.62, 1, 0.25],
  hp: { bandYaw: 1.57, bandDx: -30 },
  wings: [{ type: "fan", rootLine: [[48, -67], [43, -19]], lead: [[48, -67], [130, -76], [210, -76]], tips: [[210, -76], [205, -52], [186, -33], [152, -19], [114, -14]], fw: 22, cov: 0.2, notch: 0.05 }],
  tail: { base: [-80, 40], tip: [-150, 55], w: 22, n: 3, fan: 0.5 },
  feet: [{ x: -20, y: 96, dir: 0.4, size: 28, leg: 4, flat: 0.35, spread: 0.5, w: 0.21 }, { x: 45, y: 104, dir: 0.3, size: 28, leg: 4, flat: 0.35, spread: 0.5, w: 0.21 }],
}), o);
export const TURN3 = (o) => FRONT(merge({
  head: { x: 18, y: -128, yaw: 0.55, roll: 0.02 },
  eyes: { look: [0.8, -0.05] },
  bandS: [-2, -64, 44, 0.62, 0.8, 0.82, 1.5],
  wings: [{ type: "folded", S: [40, -66], T: [110, 50], w: 42, side: -1, n: 4, bold: "inner", rows: 2, tipFrom: 0.6, pow: 0.6, innerBow: 0.4 }],
  feet: [{ x: -34, y: 118, dir: 2.0, size: 30, leg: 16, flat: 0.6, spread: 0.6, w: 0.21 }, { x: 36, y: 108, dir: 0.6, size: 30, leg: 14, flat: 0.45, spread: 0.55, w: 0.21 }],
}, o));
export const FRONTLOOK = (look, o) => FRONT(merge({ eyes: { look } }, o));

// 64.32: wings dropped out to both sides, head turned a little to the viewer's left, eyes wide, looking left
export const DROP = (o) => FRONT(merge({
  head: { x: -12, y: -128, yaw: -0.32, roll: -0.03 },
  eyes: { look: [-0.85, -0.1], brow: { lift: 0.05, tilt: 0.25, len: 1.1, color: "rgba(60,60,60,0.85)", w: 1.4 } },
  bandS: [-40, -62, 44, 0.62, 0.9, 0.82, 1.5],
  wings: [
    { type: "fan", rootLine: [[-62, -67], [-57, 10]], lead: [[-62, -67], [-110, -45], [-143, -10]], tips: [[-143, -10], [-148, 29], [-138, 62], [-114, 81], [-86, 86]], fw: 22, cov: 0.25, notch: 0.05 },
    { type: "fan", rootLine: [[62, -67], [57, 10]], lead: [[62, -67], [110, -50], [138, -29]], tips: [[138, -29], [152, 10], [152, 43], [133, 67], [110, 76]], fw: 22, cov: 0.25, notch: 0.05 },
  ],
  tail: null,
}, o));

// 64.36: running at the scissors: rear three-quarter facing left, eyes squeezed shut, the near wing thrown forward
export const RUN = (o) => merge(FLAP("mid", {
  head: { x: -25, y: -135, yaw: -1.5, pitch: -0.1 },
  eyes: { az: 0.95 },
  hp: { bandDx: 8 },
  wings: [{ type: "fan", rootLine: [[-55, -64], [-36, 9]], lead: [[-55, -64], [-100, -55], [-127, -36]], tips: [[-127, -36], [-123, -9], [-109, 18], [-82, 36]], fw: 22, cov: 0.2, notch: 0.05 }],
}), o);
