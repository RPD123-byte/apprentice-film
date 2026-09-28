// The face (front view, heavy-lidded): skin, eyes, brows, nose, stubble, sweat. Frame coordinates, measured on the
// source at 27.0 s (grid crops). The mouth is separate (it smiles 27.08–28.16).
import { taper } from "../../lib/ink.js";
import { sampleCurve, smoothPath } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";
import { poly, blob, gv, line, lock, hatch, comb, flecks, soft, vline, bandStrokes, resampleCurve } from "./kit.js";

export const SKIN = "#f3f2ee";
export const DARK = "#161616";

export const FACE = [[770, 150], [860, 106], [1000, 84], [1150, 94], [1290, 138], [1345, 230], [1356, 380], [1358, 520], [1346, 600], [1312, 650], [1266, 715], [1226, 775], [1202, 818], [962, 818], [934, 776], [900, 732], [868, 700], [826, 650], [786, 560], [762, 480], [748, 380], [746, 250]];

// Eyes measured on the source at 27.0 (4.5x crops): lash line, iris, waterline, lower-lid rim, bag, lid crease.
const EYES = [
  {
    side: -1,
    lash: [[744, 340], [764, 334.5], [785, 332], [805, 330], [840, 328.5], [877, 327], [901, 324.5], [919, 327], [931, 332], [942, 339]],
    lashW: [1.5, 5, 9, 9, 10, 10, 7.5, 7.5, 5, 2],
    iris: [859, 331, 30], pupil: [859, 330, 11.5],
    water: [[776, 339], [800, 347], [830, 354], [860, 357], [890, 355], [915, 350], [935, 343], [947, 338]],
    rim: [[788, 354], [815, 362], [850, 367], [885, 366], [915, 360], [942, 349]],
    bag: [[792, 368], [818, 376], [852, 377], [890, 386], [916, 383], [944, 364]],
    crease: [[782, 305], [815, 290], [860, 284], [900, 288], [930, 298], [947, 312]],
    bone: [[800, 281], [830, 274], [862, 271], [905, 277], [925, 285]],
    inner: (u) => u, fold: 0.32,
  },
  {
    side: 1,
    lash: [[1141, 334], [1150, 327], [1160, 320], [1170, 315.5], [1185, 313], [1210, 312.5], [1250, 312], [1280, 311], [1303, 310.5], [1318, 313], [1330, 317], [1340, 323]],
    lashW: [2, 5, 8, 8.5, 8, 9, 9, 8.5, 9, 6, 4, 1.5],
    iris: [1225, 315, 32], pupil: [1219, 314, 13],
    water: [[1146, 336], [1165, 341], [1190, 344.5], [1225, 347], [1262, 345], [1290, 339], [1310, 331], [1330, 322]],
    rim: [[1156, 345], [1190, 351], [1225, 353.5], [1262, 351], [1292, 345], [1316, 335]],
    bag: [[1150, 352], [1176, 368], [1204, 369], [1240, 363], [1280, 357], [1310, 346]],
    crease: [[1138, 302], [1170, 284], [1210, 274], [1260, 271], [1300, 280], [1326, 295]],
    bone: [[1185, 263], [1240, 257], [1292, 263]],
    inner: (u) => 1 - u, fold: 0.6,
  },
];
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function eye(g, E, seed) {
  const r = rng(seed);
  const { lash, water, rim, bag, crease } = E;
  const [ix, iy, ir] = E.iris;
  // upper lid: white skin, the crease and fold lines running parallel to the lash line (6-30 px above it)
  line(g, E.bone, 1.0, "rgba(40,40,40,0.35)", { a: 0.05 });
  line(g, crease, 1.3, "rgba(30,30,30,0.55)", { a: 0.08 });
  bandStrokes(g, crease, lash.map(([x, y]) => [x, y - 5]), { n: 6, w: (u, f) => 0.9 + 0.4 * f, alpha: (u, f) => (0.3 + 0.25 * f) * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, Math.max(0, u)))), seg: [0.18, 0.5], gap: 0.3, seed: seed + 1, from: 0.04, to: 0.96 });
  // the outer corner: a few strokes fanning out along the lid
  bandStrokes(g, crease, lash.map(([x, y]) => [x, y - 3]), { n: 5, w: () => 1.1, alpha: (u) => 0.5 * (1 - sm(0, 0.25, E.side < 0 ? u : 1 - u)), seg: [0.1, 0.25], gap: 0.2, seed: seed + 2 });
  // the fold just above the lash line: close grey lines, heavier on the right eye
  bandStrokes(g, lash.map(([x, y]) => [x, y - 15]), lash.map(([x, y]) => [x, y - 3]), { n: 7, w: () => 1.2, alpha: (u) => E.fold * (0.5 + 0.5 * Math.sin(Math.PI * u)), seg: [0.15, 0.45], gap: 0.15, seed: seed + 7, from: 0.05, to: 0.97 });
  // the opening: sclera, iris (top under the lid), pupil
  const open = (c) => { smoothPath(c, [...lash.slice(1, -1), ...water.slice().reverse()], true); };
  g.save(); g.beginPath(); open(g); g.fillStyle = "#ecebe7"; g.fill(); g.clip();
  soft(g, null, (c) => { c.ellipse(ix, iy + 18, ir * 3.4, ir * 0.9, 0, 0, 7); }, "rgba(110,110,110,0.3)", 10);
  const rg = g.createRadialGradient(ix, iy, 2, ix, iy, ir);
  rg.addColorStop(0, "#0e0e0e"); rg.addColorStop(0.38, "#141414"); rg.addColorStop(0.45, "#3c3c3c"); rg.addColorStop(0.72, "#707070"); rg.addColorStop(0.9, "#2e2e2e"); rg.addColorStop(1, "#121212");
  g.fillStyle = rg; g.beginPath(); g.arc(ix, iy, ir, 0, 7); g.fill();
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2 + r() * 0.05, r0 = ir * (0.44 + r() * 0.06), r1 = ir * (0.8 + r() * 0.18);
    const light = Math.sin(a) > 0.2 && r() < 0.6;
    taper(g, [[ix + Math.cos(a) * r0, iy + Math.sin(a) * r0], [ix + Math.cos(a) * r1, iy + Math.sin(a) * r1]], (u) => 1.3 * (1 - u * 0.6), light ? `rgba(215,215,210,${0.35 + 0.3 * r()})` : `rgba(15,15,15,${0.3 + 0.4 * r()})`);
  }
  const [px, py, pr] = E.pupil;
  g.fillStyle = "#0a0a0a"; g.beginPath(); g.arc(px, py, pr, 0, 7); g.fill();
  // the lid's shadow over the top of the opening
  const sh = g.createLinearGradient(0, iy - 4, 0, iy + 10);
  sh.addColorStop(0, "rgba(8,8,8,0.85)"); sh.addColorStop(1, "rgba(8,8,8,0)");
  g.fillStyle = sh; g.fillRect(ix - ir * 4, iy - ir, ir * 8, ir + 10);
  g.restore();
  // the lash line: heavy, the lower edge ragged with short lashes, the outer corner hooking down
  vline(g, lash, E.lashW, "#0b0b0b");
  comb(g, lash.slice(1, -1), { step: 2.4, len: (u) => 3 + 3 * Math.sin(Math.PI * u), ang: E.side * 0.25, side: -E.side, w: 1.3, color: "#0e0e0e", seed: seed + 3, from: 0.02, to: 0.98 });
  const oc = E.side < 0 ? lash.slice(0, 3) : lash.slice(-3).reverse();
  for (let k = 0; k < 4; k++) {
    const [x0, y0] = oc[1];
    line(g, [[x0, y0], [x0 + E.side * (6 + 3 * k), y0 + 3 + k * 2.5], [x0 + E.side * (10 + 4 * k), y0 + 8 + k * 3.5]], 1.4 - k * 0.2, "rgba(14,14,14,0.8)", { a: 0.1 });
  }
  // waterline and lower-lid rim, tiny lower lashes
  line(g, water, 2.8, "rgba(18,18,18,0.95)", { a: 0.2 });
  bandStrokes(g, water, rim, { n: 3, w: () => 1.2, alpha: () => 0.5, seg: [0.2, 0.5], gap: 0.3, seed: seed + 8, from: 0.08, to: 0.92 });
  line(g, rim, 2.1, "rgba(24,24,24,0.8)", { a: 0.1 });
  comb(g, rim.slice(1, -1), { step: 3, len: 5, ang: 0, side: E.side, w: 1.2, color: "rgba(18,18,18,0.7)", seed: seed + 4, from: 0.05, to: 0.95 });
  // tired bags: hatched crescent under the rim, darkest in the inner third, fading at the bottom
  soft(g, null, (c) => { smoothPath(c, [...rim.map(([x, y]) => [x, y + 2]), ...bag.slice().reverse().map(([x, y]) => [x, y - 3])], true); }, "rgba(50,50,50,0.42)", 2.5);
  bandStrokes(g, rim.map(([x, y]) => [x, y + 1.5]), bag, { n: 13, w: (u, f) => 2.1 - 0.9 * f, alpha: (u, f) => (0.78 + 0.2 * sm(0.4, 0.85, E.inner(u))) * (1 - 0.62 * f) * (0.75 + 0.25 * Math.sin(Math.PI * u)), seg: [0.12, 0.35], gap: 0.08, seed: seed + 5 });
  bandStrokes(g, rim.map(([x, y]) => [x, y + 3]), bag.map(([x, y]) => [x, y - 2]), { n: 5, w: () => 1.2, alpha: (u) => 0.45 * sm(0.45, 0.9, E.inner(u)), seg: [0.08, 0.2], gap: 0.1, seed: seed + 6 });
  bandStrokes(g, bag, bag.map(([x, y]) => [x, y + 14]), { n: 4, w: () => 1.0, alpha: (u, f) => 0.28 * (1 - f) * Math.sin(Math.PI * u), seg: [0.15, 0.4], gap: 0.3, seed: seed + 9 });
  // inner corner
  const ic = E.side < 0 ? lash[lash.length - 1] : lash[0];
  g.fillStyle = "rgba(30,30,30,0.75)"; g.beginPath(); g.ellipse(ic[0] - E.side * 1, ic[1] + 1, 3.5, 2.5, 0, 0, 7); g.fill();
}

// The brows: strokes combed outward, denser along the lower edge. They rise with the smile (measured by template
// tracking against 26.76: left brow mid (+9,-13), inner end (0,-11); right brow inner (+1,-8), outer (-6,-9)).
const BROWS = [
  { spine: [[792, 222], [830, 214], [860, 213], [900, 217], [930, 224], [947, 232]], w: [15, 20, 24, 24, 18, 8], out: -1, seed: 71,
    off: (x) => { const k = sm(945, 870, x); return [9 * k, -11 - 2 * k]; } },
  { spine: [[1113, 245], [1135, 229], [1160, 216], [1190, 208], [1220, 203], [1250, 201], [1280, 203], [1303, 209]], w: [5, 15, 20, 22, 21, 20, 16, 10], out: 1, seed: 72,
    off: (x) => (x < 1190 ? [1 + (x - 1113) / 77, -8 - (x - 1113) / 77] : [2 - 8 * sm(1190, 1260, x), -9]) },
];
export function drawBrows(g, p) {
  for (const B of BROWS) {
    const r = rng(B.seed);
    const s = resampleCurve(B.spine, 70);
    const n = s.length, nw = B.w.length;
    const wAt = (u) => { const f = u * (nw - 1), i = Math.min(nw - 2, Math.floor(f)), k = f - i; return B.w[i] + (B.w[i + 1] - B.w[i]) * k; };
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), wid = wAt(u);
      const a = s[Math.min(n - 1, i + 1)], b = s[Math.max(0, i - 1)];
      let tx = a[0] - b[0], ty = a[1] - b[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      // outward along the brow (toward the temple), tilted up a little (more at the inner end)
      const inner = B.out < 0 ? u : 1 - u;
      const th = 0.28 + 0.55 * sm(0.72, 1, inner);
      let dx = B.out * tx * Math.cos(th), dy = B.out * ty * Math.cos(th) - Math.sin(th);
      const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
      for (let k = 0; k < 6; k++) {
        const across = (Math.pow(r(), 0.75) - 0.4) * wid;      // biased toward the lower edge
        const x = s[i][0] - ty * across, y = s[i][1] + tx * across;
        const L = 9 + r() * 13, ww = 1.4 + r() * 1.3, al = 0.65 + 0.33 * r();
        const [ox2, oy2] = B.off(x);
        const X = x + ox2 * p, Y = y + oy2 * p;
        const bend = (r() - 0.5) * 3;
        taper(g, [[X, Y], [X + dx * L * 0.5 - dy * bend, Y + dy * L * 0.5 + dx * bend], [X + dx * L, Y + dy * L]], (q) => ww * (1 - q * 0.85), `rgba(10,10,10,${al})`);
      }
    }
  }
}
export const BROW_BOX = [760, 160, 1330, 260];

function drop(g, x, y, s, seed) {
  // sweat bead: a thin run line above a round drop with a dark rim and a white glint
  line(g, [[x, y - s * 2.2], [x - s * 0.1, y - s * 1.1], [x, y - s * 0.4]], s * 0.35, "rgba(40,40,40,0.55)", { a: 0.1 });
  g.fillStyle = "#e8e7e3"; g.beginPath(); g.ellipse(x, y, s * 0.55, s * 0.65, 0, 0, 7); g.fill();
  g.strokeStyle = "rgba(25,25,25,0.85)"; g.lineWidth = Math.max(1, s * 0.18);
  g.beginPath(); g.ellipse(x, y, s * 0.55, s * 0.65, 0, 0.1, Math.PI - 0.1); g.stroke();
  g.fillStyle = "rgba(255,255,255,0.95)"; g.beginPath(); g.arc(x - s * 0.15, y - s * 0.1, s * 0.16, 0, 7); g.fill();
}

// The neck / far side of the jaw between the face and the right shoulder (under the hair): light skin, hatched.
const NECK = [[1352, 560], [1346, 600], [1312, 650], [1266, 715], [1226, 775], [1200, 830], [1180, 946], [1236, 830], [1300, 740], [1360, 660], [1410, 600], [1420, 540]];
export function drawNeck(g) {
  g.fillStyle = gv(0.88); g.beginPath(); smoothPath(g, NECK, true); g.fill();
  hatch(g, (c) => smoothPath(c, NECK, true), [1180, 540, 1420, 946], { dir: () => 2.1, dens: () => 0.5, sp: 4, len: 40, w: 1.1, color: "rgba(30,30,30,0.45)", seed: 131 });
}

export function drawFace(g) {
  const r = rng(606);
  g.save();
  g.fillStyle = SKIN; g.beginPath(); smoothPath(g, FACE, true); g.fill();
  g.beginPath(); smoothPath(g, FACE, true); g.clip();
  // broad value: the cheeks by the hair fall into shade; a little grey under the cheekbones
  soft(g, null, (c) => c.ellipse(1345, 450, 30, 200, 0.05, 0, 7), "rgba(90,90,90,0.25)", 20);
  // eye sockets: the shade beside the nose, curved strokes following the socket rim
  bandStrokes(g, [[882, 258], [900, 268], [914, 288], [924, 310], [930, 330]], [[906, 248], [926, 260], [939, 284], [945, 310], [946, 334]], { n: 12, w: () => 1.25, alpha: (u, f) => 0.45 + 0.25 * f, seg: [0.3, 0.7], gap: 0.1, seed: 82 });
  bandStrokes(g, [[860, 255], [880, 262], [896, 280]], [[882, 258], [900, 268], [914, 288]], { n: 4, w: () => 1.0, alpha: () => 0.3, seg: [0.3, 0.7], gap: 0.3, seed: 81 });
  bandStrokes(g, [[1178, 254], [1152, 260], [1132, 278], [1122, 303], [1126, 334]], [[1184, 292], [1164, 297], [1150, 310], [1144, 326], [1146, 338]], { n: 14, w: () => 1.3, alpha: (u, f) => 0.55 + 0.2 * Math.sin(Math.PI * u), seg: [0.3, 0.7], gap: 0.08, seed: 83 });
  bandStrokes(g, [[1170, 240], [1140, 246], [1118, 262], [1106, 290], [1108, 322]], [[1178, 254], [1152, 260], [1132, 278], [1122, 303], [1126, 334]], { n: 6, w: () => 1.1, alpha: () => 0.42, seg: [0.3, 0.6], gap: 0.25, seed: 87 });
  bandStrokes(g, [[1126, 334], [1140, 345], [1150, 356]], [[1112, 330], [1122, 350], [1136, 366]], { n: 5, w: () => 1.1, alpha: () => 0.5, seg: [0.4, 0.8], gap: 0.2, seed: 80 });
  EYES.forEach((E, i) => eye(g, E, 40 + i * 20));
  // cheek hatching by the hair on the right, and on the left under the eye
  hatch(g, null, [1250, 330, 1360, 680], { dir: (x, y) => 1.95 - (y - 330) * 0.0006, dens: (x) => Math.max(0, Math.min(1, (x - 1265) / 70)), sp: 4, len: 34, w: 1, color: "rgba(25,25,25,0.5)", seed: 83 });
  hatch(g, null, [740, 350, 820, 480], { dir: () => 1.25, dens: (x) => Math.max(0, Math.min(1, (815 - x) / 55)), sp: 4.5, len: 26, w: 1, color: "rgba(25,25,25,0.5)", seed: 84 });
  // broad form hatching: temples and cheeks turning away, under the cheekbones, the jaw
  hatch(g, null, [760, 380, 900, 600], { dir: () => 1.3, dens: (x, y) => Math.max(0, Math.min(1, (870 - x) / 90)) * 0.7, sp: 4.2, len: 34, w: 1, color: "rgba(25,25,25,0.4)", seed: 133 });
  hatch(g, null, [1180, 380, 1350, 700], { dir: (x, y) => 1.9 + (y - 500) * 0.0006, dens: (x, y) => Math.max(0, Math.min(1, (x - 1200) / 120)) * 0.75, sp: 4.2, len: 36, w: 1, color: "rgba(25,25,25,0.42)", seed: 134 });
  hatch(g, null, [960, 700, 1220, 815], { dir: () => 1.55, dens: (x, y) => Math.max(0, Math.min(1, (y - 740) / 70)) * 0.45, sp: 4.5, len: 22, w: 1, color: "rgba(25,25,25,0.35)", seed: 135 });
  hatch(g, null, [880, 80, 1300, 200], { dir: () => 0.05, dens: (x, y) => Math.max(0, Math.min(1, (130 - y) / 40)) * 0.5, sp: 4, len: 40, w: 1, color: "rgba(25,25,25,0.35)", seed: 136 });
  // nose (source 27.0): shaded bridge sides, alae drawn as short heavy strokes, dark nostrils, a hatched underside
  hatch(g, (c) => { smoothPath(c, [[1012, 425], [1024, 470], [1016, 520], [1000, 548], [984, 540], [990, 490], [996, 440]], true); }, [980, 420, 1030, 555], { dir: () => 1.75, dens: (x, y) => 0.65 * sm(420, 470, y), sp: 3.6, len: 34, w: 1.0, color: "rgba(30,30,30,0.5)", seed: 85 });
  hatch(g, (c) => { smoothPath(c, [[1082, 455], [1098, 470], [1112, 500], [1116, 535], [1100, 530], [1088, 500], [1080, 470]], true); }, [1076, 450, 1120, 540], { dir: () => 1.3, dens: () => 0.6, sp: 3.6, len: 28, w: 1.0, color: "rgba(30,30,30,0.5)", seed: 88 });
  line(g, [[1006, 430], [1003, 470], [998, 505]], 1.2, "rgba(30,30,30,0.4)");
  line(g, [[1090, 445], [1098, 475], [1108, 500]], 1.2, "rgba(30,30,30,0.4)");
  for (const [pts, w] of [[[[992, 506], [982, 526], [976, 548], [979, 564], [990, 575]], 3.0], [[[998, 512], [989, 530], [985, 550]], 1.6], [[[1108, 500], [1121, 520], [1128, 543], [1126, 562], [1116, 574]], 3.0], [[[1104, 510], [1114, 530], [1119, 550]], 1.6]]) line(g, pts, w, "rgba(22,22,22,0.85)", { a: 0.12, bias: 0.65 });
  hatch(g, (c) => { smoothPath(c, [[982, 530], [992, 545], [994, 568], [984, 572], [976, 555]], true); }, [972, 525, 998, 578], { dir: () => 1.9, dens: () => 0.8, sp: 2.6, len: 12, w: 1.0, color: "rgba(25,25,25,0.6)", seed: 89 });
  hatch(g, (c) => { smoothPath(c, [[1116, 528], [1128, 545], [1124, 568], [1114, 568], [1112, 548]], true); }, [1108, 522, 1132, 572], { dir: () => 1.25, dens: () => 0.8, sp: 2.6, len: 12, w: 1.0, color: "rgba(25,25,25,0.6)", seed: 90 });
  line(g, [[998, 572], [1016, 566], [1038, 574]], 6, "#161616", { a: 0.3, bias: 0.35 });
  line(g, [[1080, 574], [1100, 566], [1114, 570]], 6, "#161616", { a: 0.3, bias: 0.65 });
  line(g, [[1034, 578], [1060, 589], [1085, 577]], 2.2, "rgba(25,25,25,0.85)", { a: 0.3 });
  hatch(g, (c) => c.ellipse(1062, 596, 44, 9, 0, 0, 7), [1015, 584, 1110, 608], { dir: () => 0.35, dens: () => 0.75, sp: 2.8, len: 16, w: 0.9, color: "rgba(30,30,30,0.5)", seed: 86 });
  // philtrum
  line(g, [[1046, 646], [1060, 650], [1074, 646]], 1.3, "rgba(40,40,40,0.45)");
  line(g, [[1040, 660], [1060, 665], [1080, 660]], 1.5, "rgba(40,40,40,0.45)");
  // stubble: upper lip, chin, jaw sides
  flecks(g, 1060, 632, 125, 32, 66, { ang: 1.5, angJ: 1.2, len: 6, w: 1.1, color: "rgba(35,35,35,0.4)", seed: 91 });
  flecks(g, 1075, 772, 140, 38, 78, { ang: 1.5, angJ: 0.9, len: 7, w: 1.1, color: "rgba(35,35,35,0.4)", seed: 92 });
  flecks(g, 1205, 735, 55, 70, 90, { ang: 1.9, angJ: 0.6, len: 8, w: 1.2, color: "rgba(30,30,30,0.45)", seed: 93 });
  flecks(g, 935, 740, 40, 55, 54, { ang: 1.2, angJ: 0.6, len: 7, w: 1.1, color: "rgba(30,30,30,0.4)", seed: 94 });
  // the cheek beside the fist falls into shade
  hatch(g, null, [880, 540, 960, 720], { dir: () => 1.9, dens: (x, y) => Math.max(0, Math.min(1, (950 - x) / 60)) * 0.8, sp: 3.4, len: 26, w: 1.1, color: "rgba(25,25,25,0.5)", seed: 132 });
  // left jaw: the tapered contour down to the laptop, with a hatch shadow beside it
  line(g, [[866, 694], [900, 720], [935, 760], [955, 785], [972, 805]], 5, "#1b1b1b", { a: 0.25, bias: 0.6 });
  hatch(g, (c) => { c.moveTo(870, 700); c.lineTo(975, 808); c.lineTo(1000, 808); c.lineTo(900, 700); c.closePath(); }, [860, 690, 1000, 810], { dir: () => 0.85, dens: () => 0.8, sp: 3.5, len: 16, w: 0.9, color: "rgba(30,30,30,0.5)", seed: 95 });
  // sweat
  drop(g, 916, 156, 7, 1); drop(g, 1141, 163, 9, 2); drop(g, 1169, 118, 7, 3); drop(g, 808, 437, 6, 4); drop(g, 1116, 417, 9, 5); drop(g, 1270, 522, 8, 6);
  g.restore();
}

// The mouth at smile amount p (0 neutral/slightly down, 1 the small smile at 28.16+).
const MN = [[958, 699], [985, 692], [1020, 685], [1045, 686], [1062, 690], [1080, 687], [1110, 683], [1145, 687], [1178, 694]];
const MS = [[924, 659], [955, 666], [1005, 670], [1045, 674], [1063, 677], [1082, 674], [1130, 667], [1182, 657], [1222, 641]];
const LN = [[990, 723], [1026, 726], [1062, 728], [1098, 726], [1130, 723]];
const LS = [[988, 708], [1025, 711], [1062, 713], [1100, 711], [1134, 708]];
// the corners lead, the middle of the mouth follows (measured: at 27.3 the corners are 35 % of the way, the middle 17 %)
const mix = (A, B, p) => A.map((a, i) => { const c = 1 - Math.abs(i - (A.length - 1) / 2) / ((A.length - 1) / 2), q = Math.pow(p, 1 + 0.8 * c); return [a[0] + (B[i][0] - a[0]) * q, a[1] + (B[i][1] - a[1]) * q]; });
export const MOUTH_BOX = [880, 620, 1250, 760];
export function drawMouth(g, p) {
  const m = mix(MN, MS, p), l = mix(LN, LS, p);
  // lower lip: a hatched crescent under the lip
  const r = rng(97);
  // lower lip: a stack of short dark strokes under the lip, heaviest near the top in the middle
  for (let k = 0; k < 10; k++) {
    const f = k / 9;
    const span = 1 - 0.35 * f - 0.1 * r();
    const pts = l.map(([x, y], i) => [l[2][0] + (x - l[2][0]) * span, y + f * 11 - Math.abs(i - 2) * 1.3]);
    const q = k % 3 === 1 ? pts.slice(0, 4) : k % 3 === 2 ? pts.slice(1) : pts;
    line(g, q, 1.1 + 1.1 * (1 - f), `rgba(18,18,18,${0.8 - 0.35 * f})`, { a: 0.06 });
  }
  line(g, l.map(([x, y]) => [l[2][0] + (x - l[2][0]) * 1.02, y - 3]), 1.1, "rgba(40,40,40,0.4)", { a: 0.05 });
  // upper lip: a faint hatch band above the line
  line(g, m.slice(2, 7).map(([x, y], i) => [x, y - 7 + Math.abs(i - 2) * 1.2]), 1.4, "rgba(40,40,40,0.4)", { a: 0.1 });
  // the mouth line: heavy in the middle with a small V at the centre, tapering to the corners; the corners flick up
  // only as he smiles
  taper(g, sampleCurve(m, 8), (u) => { const c = Math.abs(u - 0.5) * 2; return (3.5 - 1.4 * c + 1.2 * c * c) * (1 - Math.pow(c, 6) * 0.75); }, "#1a1a1a");
  const L0 = m[0], R0 = m[m.length - 1];
  if (p > 0.02) {
    line(g, [[L0[0] + 10, L0[1] + 2], [L0[0] + 2, L0[1]], [L0[0] - 3, L0[1] - 2 - 4 * p]], 4.2 * p, "#161616", { a: 0.05, bias: 0.3 });
    line(g, [[R0[0] - 10, R0[1] + 2], [R0[0] - 2, R0[1]], [R0[0] + 3, R0[1] - 2 - 4 * p]], 4.2 * p, "#161616", { a: 0.05, bias: 0.3 });
  }
  // smile creases at the cheeks
  if (p > 0.3) {
    const a = Math.min(1, (p - 0.3) / 0.5) * 0.45;
    line(g, [[1233, 612], [1252, 632], [1248, 655]], 1.6, `rgba(30,30,30,${a})`);
    line(g, [[905, 625], [898, 645], [908, 662]], 1.4, `rgba(30,30,30,${a * 0.7})`);
  }
}
