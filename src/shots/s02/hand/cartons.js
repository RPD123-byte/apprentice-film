// s02: the carton stack the pan stops on (14.44 s) and the room behind it, in HOLD-frame px (world = hold + BOX_OFF).
// Fix pass 1: re-read face by face off 2-2.4x grid crops of the hold average (brightened) and a mosaic of the flight
// frames in hold coords (snapshots/s02-fix1-z/hz1, hz2, hstepL, htop, hfarR, hold_mosaic). The source draws each carton
// as a flat lit face with fine dark vertical streaks hanging from the top edge (and a few rising from the bottom), dark
// ink edges and a light rim on the top edges; the faces turned from the light are near black with a few pale grain lines
// and light edge lines. Face values are calibrated per face against the hold average (FACE_K), not airbrushed.
import { rng } from "../../../lib/rng.js";
import { sampleCurve } from "../../../lib/paths.js";
import { gv, poly, fillPath, withClip, ribbon, P_TIP2, P_HANG } from "./pen.js";
import { wood, mesh, wline, rect } from "./scratch.js";

// kind: "lit" (streaked light face), "dim" (a lit face far from the light: dark grey, pale streaks), "dark" (the side
// turned away: black, a few pale grain lines), "recess" (black with fine cross lines).
// v: face value (paint 0..1); tape: [x0, y0, x1, y1] hanging label; rim: indices of edges (i -> i+1) that carry a light
// line; hi: extra light edge lines [[x, y], ...] (edges running on past the face, e.g. the long box tops at the right)
export const FACES = [
  // ---- the room's far left: two dim boxes stacked, one below, one small box by the post
  { p: [[105, 432], [245, 493], [245, 630], [105, 600]], v: 0.2, kind: "dim", tape: [168, 470, 200, 516] },
  { p: [[63, 575], [290, 650], [290, 795], [63, 800]], v: 0.17, kind: "dim" },
  { p: [[100, 800], [290, 795], [290, 946], [100, 946]], v: 0.08, kind: "dim" },
  { p: [[231, 784], [375, 772], [375, 946], [231, 946]], v: 0.05, kind: "dim" },
  { p: [[370, 772], [455, 795], [455, 946], [370, 946]], v: 0.12, kind: "dim" },
  // a tall dim box against the back wall, left of the stack (streaked)
  { p: [[478, 178], [564, 168], [564, 470], [478, 478]], v: 0.14, kind: "dim" },
  // ---- the stack's left steps: tier 2 and tier 3, dark on the left, lit where they turn to the light
  { p: [[537, 482], [707, 440], [707, 571], [537, 608]], v: 0.045, kind: "dark", tape: [602, 461, 640, 505], rim: [0] },
  { p: [[475, 621], [723, 568], [723, 800], [475, 830]], v: 0.035, kind: "dark", tape: [573, 610, 621, 671], rim: [0, 3] },
  { p: [[723, 568], [800, 590], [800, 722], [752, 727], [740, 792], [723, 796]], v: 0.68, kind: "lit" },
  { p: [[707, 440], [850, 493], [850, 535], [800, 543], [800, 590], [723, 568], [707, 568]], v: 0.74, kind: "lit", rim: [0] },
  // ---- the centre stack, back to front
  { p: [[885, 293], [953, 327], [951, 518], [885, 486]], v: 0.6, kind: "lit", rim: [0] },
  { p: [[725, 329], [885, 293], [885, 486], [850, 493], [725, 446]], v: 0.74, kind: "lit", tape: [783, 316, 817, 350], rim: [0] },
  { p: [[1160, 322], [1281, 387], [1281, 575], [1235, 562], [1162, 530]], v: 0.2, kind: "dim", rim: [0, 1] },
  { p: [[950, 348], [1160, 320], [1162, 530], [1082, 495], [950, 515]], v: 0.8, kind: "lit", rim: [0], lift: [1090, 350, 130, 0.35] },
  { p: [[850, 493], [950, 518], [850, 535]], v: 0.05, kind: "recess" },
  { p: [[1082, 495], [1235, 562], [1237, 742], [1197, 737], [1080, 700]], v: 0.012, kind: "dark", rim: [0] },
  { p: [[800, 543], [1082, 495], [1080, 700], [1006, 690], [800, 722]], v: 0.72, kind: "lit", tape: [903, 523, 946, 584], rim: [0] },
  { p: [[752, 727], [1006, 690], [1006, 946], [752, 946]], v: 0.0, kind: "dark" },
  { p: [[1006, 690], [1197, 740], [1197, 946], [1006, 946]], v: 0.3, kind: "dim", rim: [0] },
  // ---- the right of the stack: two lit boxes with long dark sides, a streaked one, two lit ones in front
  { p: [[1434, 497], [1604, 575], [1604, 679], [1434, 610]], v: 0.015, kind: "dark", rim: [0, 1] },
  { p: [[1287, 519], [1434, 497], [1434, 610], [1287, 612]], v: 0.74, kind: "lit", rim: [0] },
  { p: [[1384, 600], [1636, 696], [1636, 746], [1462, 690], [1384, 692]], v: 0.015, kind: "dark", rim: [0, 1] },
  { p: [[1237, 625], [1384, 600], [1384, 692], [1237, 702]], v: 0.78, kind: "lit", rim: [0] },
  { p: [[1237, 705], [1462, 690], [1462, 758], [1387, 753], [1319, 781], [1237, 790]], v: 0.34, kind: "dim", rim: [0] },
  { p: [[1540, 772], [1750, 875], [1750, 946], [1540, 946]], v: 0.01, kind: "dark", rim: [0] },
  { p: [[1319, 781], [1387, 753], [1540, 772], [1540, 946], [1319, 946]], v: 0.6, kind: "lit", tape: [1443, 762, 1484, 819], rim: [0, 1] },
  { p: [[1197, 740], [1237, 742], [1237, 824], [1197, 824]], v: 0.25, kind: "dim" },
  { p: [[1212, 824], [1350, 850], [1350, 946], [1212, 946]], v: 0.62, kind: "lit", tape: [1255, 830, 1282, 880], rim: [0] },
  // ---- the far right: a lit box with a long dark top running off right, a hatched one under it, one below that
  { p: [[1886, 496], [2300, 540], [2300, 700], [1886, 671]], v: 0.008, kind: "dark", rim: [0] },
  { p: [[1736, 568], [1886, 496], [1886, 671], [1736, 725]], v: 0.5, kind: "lit", tape: [1793, 536, 1825, 582], rim: [0] },
  { p: [[1950, 671], [2300, 706], [2300, 850], [1950, 843]], v: 0.006, kind: "dark", rim: [0] },
  { p: [[1754, 736], [1943, 671], [1950, 843], [1754, 875]], v: 0.26, kind: "dim", hatchTop: true, rim: [0] },
  { p: [[1996, 830], [2300, 852], [2300, 946], [1996, 946]], v: 0.006, kind: "dark", rim: [0] },
  { p: [[1757, 872], [1996, 830], [1996, 946], [1757, 946]], v: 0.2, kind: "dim", rim: [0] },
  // ---- the row under the hold view (seen in the flight, blurred; read in hold coords off frames 424-440): a dark gap
  // under the stack, then a streaked box, a lit box with a label, a dim one, their top edges catching the light
  { p: [[740, 946], [1560, 946], [1560, 1300], [740, 1300]], v: 0.0, kind: "dark" },
  { p: [[830, 997], [945, 1008], [945, 1250], [830, 1250]], v: 0.35, kind: "dim", rim: [0] },
  { p: [[1165, 997], [1365, 1035], [1365, 1250], [1165, 1250]], v: 0.5, kind: "lit", tape: [1245, 1008, 1290, 1045], rim: [0] },
  { p: [[1365, 1035], [1550, 997], [1550, 1250], [1365, 1250]], v: 0.12, kind: "dim", rim: [0] },
  // (fix pass 2, review medium: this row's tops entered as a bright strip at f348-356, 14.6 vs 7.1: darkened)
  { p: [[750, 1250], [900, 1250], [900, 1300], [750, 1300]], v: 0.1, kind: "dim" },
  { p: [[1000, 1250], [1150, 1250], [1150, 1300], [1000, 1300]], v: 0.1, kind: "dim" },
];
// per-face gain, calibrated against the hold average (mean inside each visible face, trace/fix1/carton_cal.py and, for the row under the hold view, carton_cal2.py on flight frames 424/428)
export const FACE_K = [0.488,0.805,0.445,0.15,0.576,1.081,0.15,0.15,0.797,1.026,1.018,0.883,1.602,1.127,3.0,0.707,0.959,3.0,0.352,0.463,0.836,0.277,0.726,1.366,0.306,0.596,0.15,0.647,0.15,0.505,0.234,0.576,0.298,0.313,1.0,0.585,0.511,0.605,1.0,1.0];

// the top edge y of a polygon at x (the highest edge crossing x, among edges above the centroid)
function topAt(P, x, cy) {
  let best = null;
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length];
    if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) { const y = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); if (y < cy && (best === null || y < best)) best = y; }
  }
  return best;
}
function botAt(P, x, cy) {
  let best = null;
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length];
    if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) { const y = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); if (y > cy && (best === null || y > best)) best = y; }
  }
  return best;
}
// lit faces' fill relative to the calibrated value (fix pass 2: the halved streaks darken the face less)
const LIT_K = 0.93;
function paintFace(g, F, seed, k = 1) {
  const pp = poly(F.p), r = rng(seed);
  const xs = F.p.map((p) => p[0]), ys = F.p.map((p) => p[1]);
  const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  const cy = (box[1] + box[3]) / 2, hgt = box[3] - box[1];
  const v = Math.min(0.97, F.v * k);
  withClip(g, pp, () => {
    if (F.kind === "lit") {
      // flat light face, a touch darker toward the bottom
      const gr = g.createLinearGradient(0, box[1], 0, box[3]);
      gr.addColorStop(0, gv(Math.min(0.97, v * 1.06 * LIT_K))); gr.addColorStop(1, gv(v * 0.9 * LIT_K));
      g.fillStyle = gr; g.fillRect(box[0] - 2, box[1] - 2, box[2] - box[0] + 4, hgt + 4);
      // a soft glow-lit patch (the box under the owl: its top centre catches the owl's light)
      if (F.lift) { const [lx, ly, lr, la] = F.lift, gl = g.createRadialGradient(lx, ly, 0, lx, ly, lr); gl.addColorStop(0, gv(0.98, la)); gl.addColorStop(1, gv(0.98, 0)); g.fillStyle = gl; g.fillRect(lx - lr, ly - lr, 2 * lr, 2 * lr); }
      // dark streaks: hanging from the top edge (lengths from short ticks to most of the face), a few rising from the
      // bottom, a few loose in the middle; thin, even, slightly wavy; denser toward the face's side edges
      // (fix pass 2, review low: the streaks were ~2x too strong: half the density and contrast)
      for (let x = box[0] + 1.2; x < box[2]; x += 3.2 + r() * 6.0) {
        const t = topAt(F.p, x, cy) ?? box[1], b = botAt(F.p, x, cy) ?? box[3], h = b - t;
        const edge = Math.min(x - box[0], box[2] - x) < 16 ? 1.7 : 1;
        if (r() < 0.85) {
          const L = Math.min(h * 0.95, 6 + Math.pow(r(), 1.6 / edge) * h * 0.9), wv = (r() - 0.5) * 2;
          ribbon(g, sampleCurve([[x, t - 2], [x + wv * 0.5, t + L * 0.5], [x + wv, t + L]], 5), P_TIP2(0.8 + r() * 1.3, 0.05, 0.6), gv(0.03, 0.2 + r() * 0.22));
        }
        if (r() < 0.5) {
          const L = 5 + Math.pow(r(), 1.4 / edge) * h * 0.5;
          ribbon(g, [[x, b + 2], [x + (r() - 0.5), b - L]], P_TIP2(0.8 + r() * 1.1, 0.05, 0.6), gv(0.03, 0.18 + r() * 0.2));
        }
        if (r() < 0.2) {
          const y0 = t + r() * h * 0.7, L = 10 + r() * h * 0.3;
          ribbon(g, [[x, y0], [x, y0 + L]], P_TIP2(1.0 + r(), 0.3, 0.4), gv(0.03, 0.15 + r() * 0.15));
        }
      }
    } else if (F.kind === "dim") {
      // a face in shadow: dark grey ground, pale vertical grain hanging from the top and rising from the bottom
      g.fillStyle = gv(v * 0.35); g.fillRect(box[0] - 2, box[1] - 2, box[2] - box[0] + 4, hgt + 4);
      for (let x = box[0] + 1.5; x < box[2]; x += 2.4 + r() * 4) {
        const t = topAt(F.p, x, cy) ?? box[1], b = botAt(F.p, x, cy) ?? box[3], h = b - t;
        const L = 10 + Math.pow(r(), 1.3) * h * 0.9, fromTop = r() < 0.55;
        const y0 = fromTop ? t : b, y1 = fromTop ? t + L : b - L;
        ribbon(g, [[x, y0], [x + (r() - 0.5) * 2, (y0 + y1) / 2], [x + (r() - 0.5) * 2, y1]], P_TIP2(1.2 + r() * 1.8, fromTop ? 0.05 : 0.5, fromTop ? 0.5 : 0.05), gv(Math.min(0.95, 0.08 + v * 2.2), 0.5 + r() * 0.4));
      }
      if (F.hatchTop) {
        // the source's cross strokes across the top of this box
        for (let i = 0; i < 26; i++) {
          const x = box[0] + r() * (box[2] - box[0]), t = topAt(F.p, x, cy) ?? box[1], y = t + 6 + r() * 70, L = 20 + r() * 50, a = -0.5 + (r() - 0.5) * 0.3;
          ribbon(g, [[x, y], [x + Math.cos(a) * L, y + Math.sin(a) * L]], P_TIP2(1.5, 0.2, 0.2), gv(0.02, 0.7));
        }
      }
    } else if (F.kind === "dark") {
      g.fillStyle = gv(v); g.fillRect(box[0] - 2, box[1] - 2, box[2] - box[0] + 4, hgt + 4);
      if (v > 0.004) wood(g, pp, [box[0] - 4, box[1] - 4, box[2] + 4, box[3] + 4], { sp: 7, v: Math.min(0.5, v * 9), seed: seed + 2, len: [14, 90], gap: 0.55, alpha: 0.55 });
    } else if (F.kind === "recess") {
      g.fillStyle = gv(v * 0.3); g.fillRect(box[0] - 2, box[1] - 2, box[2] - box[0] + 4, hgt + 4);
      for (let x = box[0]; x < box[2]; x += 6) ribbon(g, [[x, box[1]], [x + 8, box[3]]], 1.2, gv(0.5, 0.5));
      for (let y = box[1]; y < box[3]; y += 5) ribbon(g, [[box[0], y], [box[2], y + 10]], 1.0, gv(0.45, 0.4));
    }
    if (F.tape) {
      const [a, b, c, d] = F.tape, tv = F.kind === "lit" ? Math.min(0.97, v * 1.12) : Math.min(0.6, 0.12 + v * 3);
      const tp = poly([[a, b - 4], [c, b - 4], [c, d - 7], [c - 5, d - 1], [a + (c - a) * 0.62, d - 5], [a + (c - a) * 0.3, d - 1], [a, d - 3]]);
      fillPath(g, tp, gv(tv));
      g.beginPath(); tp(g); g.lineWidth = 2.2; g.strokeStyle = gv(0.03, 0.9); g.stroke();
    }
  });
  // ink edges round the face, light rim lines on the edges that catch the light
  g.beginPath(); pp(g); g.lineWidth = 3; g.lineJoin = "round"; g.strokeStyle = gv(0.01); g.stroke();
  for (const i of F.rim || []) {
    const a = F.p[i], b = F.p[(i + 1) % F.p.length];
    const lit = F.kind === "lit", dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const o = lit ? 2.6 : -1.2;          // lit faces: a rim just inside the edge; dark faces: a light line on the edge
    const col = lit ? gv(0.97, 0.9) : gv(Math.min(0.85, 0.12 + v * 14), 0.8);
    ribbon(g, [[a[0] + nx * o, a[1] + ny * o], [b[0] + nx * o, b[1] + ny * o]], (u) => (lit ? 2 : 1.6) * Math.min(1, u / 0.05, (1 - u) / 0.05), col);
  }
}

// the back of the room: near black; posts, a board, woven panels, the top board, hanging cables
function paintBack(g) {
  // top board across the frame (y 0-36, lit only from x ~650)
  // (fix pass 2: the board fades out past x ~1250; the source's upper right is nearly featureless)
  wood(g, rect(560, -40, 1500, 36), [560, -40, 1500, 36], { dir: 1, sp: 7, v: 0.2, seed: 407, val: (x) => 0.2 * Math.min(1, Math.max(0, (x - 600) / 200)) * Math.max(0.15, Math.min(1, (1400 - x) / 180)) });
  // woven panels behind: left of the owl (x 557-600), behind him to the right (1237-1478), right (1554-1850), top (1634-1728)
  mesh(g, rect(557, 130, 602, 460), [557, 130, 602, 460], { v: 0.1, pitch: 5.7, seed: 401 });
  // (fix pass 2, review medium: the upper-right room was ~2x too busy and bright, std 21.8 vs 9.9: panels dimmed ~50 %)
  mesh(g, rect(1237, 90, 1478, 400), [1237, 90, 1478, 400], { v: 0.065, pitch: 6.2, seed: 402 });
  mesh(g, rect(1554, 378, 1850, 607), [1554, 378, 1850, 607], { v: 0.075, pitch: 6.2, seed: 403 });
  mesh(g, rect(1634, 12, 1728, 262), [1634, 12, 1728, 262], { v: 0.035, pitch: 6.2, seed: 408 });
  // posts: the dim streaked one right of the stack (x 1512-1550) and a thin one left of the owl (x 628-650)
  wood(g, rect(1512, -40, 1550, 690), [1512, -40, 1550, 690], { sp: 4.5, v: 0.2, seed: 404, len: [60, 300], val: (x, y) => (y < 300 ? 0.14 : 0.2) });
  wood(g, rect(628, -40, 650, 470), [628, -40, 650, 470], { sp: 4.5, v: 0.2, seed: 405, len: [60, 300] });
  wood(g, rect(400, 164, 478, 200), [400, 164, 478, 200], { dir: 1, sp: 6, v: 0.18, seed: 409 });
  // the board right of the stack: long and dark, lit a little more toward its middle (x 1554-2090, y 264-296)
  // (fix pass 2: it fades out by x ~1820; the source shows nothing of it further right in the hold)
  wood(g, rect(1554, 264, 1830, 296), [1554, 264, 1830, 296], { dir: 1, sp: 6.5, v: 0.16, seed: 406, len: [80, 300], val: (x) => 0.17 * Math.max(0, Math.min(1, (1830 - x) / 200)) });
  wline(g, [[1554, 264], [1700, 265], [1800, 266]], 1.4, 0.2);
  // the lamp-shade arc on the right panel
  wline(g, [[1667, 380], [1740, 385], [1800, 395], [1830, 415]], 1.6, 0.4);
  // cables hanging from the top board, curling down left behind the stack (htop crop)
  wline(g, [[693, -40], [692, 60], [686, 143], [664, 214], [614, 286], [586, 343], [557, 400]], 3.2, 0.55, 0.75, 0.6);
  ribbon(g, sampleCurve([[693, -40], [692, 60], [686, 143], [664, 214], [614, 286], [586, 343], [557, 400]], 8), 1.2, gv(0.02));
  wline(g, [[800, 143], [780, 200], [750, 250], [707, 293], [680, 310]], 2.4, 0.45, 0.7, 0.6);
  // the beaded cable
  const q = sampleCurve([[857, -40], [855, 20], [843, 86], [818, 150], [800, 186], [792, 240], [789, 290]], 12);
  for (let i = 0; i < q.length - 1; i += 2) ribbon(g, [q[i], q[i + 1]], 3.6, gv(0.75, 0.7));
  for (let y = 120; y < 290; y += 7) ribbon(g, [[640, y], [640, y + 4]], 2.4, gv(0.6, 0.5));
}
// the chair back at the bottom left: a dark filled back with a light rim (hstepL)
function paintChair(g) {
  // (fix pass 2, review low: the source's back starts ~30 px higher, y ~747, x 630-744, dark with a 2 px light rim)
  const CH = [[598, 1000], [610, 880], [632, 800], [660, 760], [690, 747], [720, 749], [744, 765], [750, 1000]];
  fillPath(g, poly(CH), gv(0.025));
  wline(g, [[611, 960], [620, 860], [640, 790], [668, 757], [692, 749], [720, 752], [742, 768]], 2.0, 0.75, 0.7, 0.4);
  wline(g, [[645, 980], [652, 880], [672, 810], [700, 778], [732, 775]], 1.4, 0.4, 0.6, 0.4);
  wline(g, [[745, 830], [748, 900], [746, 990]], 1.4, 0.35, 0.5, 0.4);
}
// fix pass 2 (review medium): dim boxes left of and under the stack, seen only behind the flight (f405-452: the source
// shows dim textured box faces over x 0-1000 of the frame where the render was black; in the outbound pan the same area
// reads dark, so they live on their own layer, drawn only in the flight). Read off 3x-brightened f424 / f436, hold px.
export const FLIGHT_BACK = [-600, 400, 760, 1460];
const FB_FACES = [
  { p: [[-600, 1000], [60, 1012], [60, 1450], [-600, 1450]], v: 0.06, kind: "dim" },
  { p: [[-60, 1200], [100, 1195], [100, 1450], [-60, 1450]], v: 0.12, kind: "dim" },
  { p: [[100, 962], [500, 976], [500, 1450], [100, 1450]], v: 0.05, kind: "dim" },
  { p: [[500, 1000], [740, 1004], [740, 1450], [500, 1450]], v: 0.04, kind: "dim" },
  { p: [[-600, 420], [60, 430], [60, 1000], [-600, 990]], v: 0.03, kind: "dim" },
];
export function paintFlightBack(g) { FB_FACES.forEach((F, i) => paintFace(g, F, 900 + i * 7, 1)); }
export function paintHold(g, box) {
  g.fillStyle = gv(0.004); g.fillRect(box[0], box[1], box[2] - box[0], box[3] - box[1]);
  paintBack(g);
  FACES.forEach((F, i) => paintFace(g, F, 500 + i * 7, FACE_K[i] ?? 1));
  paintChair(g);
}
