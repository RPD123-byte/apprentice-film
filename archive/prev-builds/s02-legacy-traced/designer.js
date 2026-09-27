// s02 designer: the front close-up (knit beanie, wet black hair, bulging eyes in hatched sockets, sweat, a pencil
// between his teeth, stubble, pale hoodie, the laptop lid as a black bar). World coordinates = the 6.04 s source frame.
// Rebuilt in fix pass 1 from 2.5–4.5x grids of the source at 6.08 and 8.0 s (scratchpad s02fix1/z_*.jpg):
//   - hair: the three dark masses are measured silhouettes (hairShapes.js) with their light partings cut out, then
//     inked strands on top: thin partings along hand-set flow guides, loose strands over the forehead, flyaways;
//   - eyes: globes with a thin heavy upper lid, lid crease, double lower lid and lashes, radially striated irises;
//     the sockets are built from curved and crossed hatching only (no smooth grey);
//   - beanie: crown dome (top at world y -352, fold at -137, measured at 12.52 s) over a ribbed cuff whose ribs fan
//     round the head, with cross-hatched knit patches on the shaded sides;
//   - hoodie: a pale value (~0.6) with a cross-hatched band along each shoulder and long comb strokes hanging from it.
// Dark ink on white, drawn straight onto a Canvas2D layer (the source draws him as manga ink, not scratchboard).
// The eyes and the sweat drops are drawn per frame (paintEye, drop) because they move.
import { taper } from "../../lib/ink.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { rng, clamp } from "../../lib/rng.js";
import { HAIR, HAIR_MAIN } from "./hairShapes.js";

const PI = Math.PI;
export const INKC = "#0b0b0b";
export const gv = (v, a = 1) => { const c = Math.round(clamp(v) * 255); return a >= 1 ? `rgb(${c},${c},${c})` : `rgba(${c},${c},${c},${a})`; };
const wv = (a) => `rgba(246,245,241,${a})`;
const SKINV = 0.945;

// ---------- shapes (world px) ----------
export const HOODIE = [
  [-20, 946], [0, 946], [20, 930], [50, 860], [80, 800], [100, 750], [125, 690], [150, 650], [200, 622], [250, 600], [300, 582], [350, 565], [400, 548],
  [450, 530], [500, 502], [550, 486], [585, 470], [640, 452], [700, 445], [1000, 440], [1300, 445], [1450, 480], [1500, 486], [1550, 515], [1600, 545],
  [1650, 565], [1700, 580], [1750, 590], [1800, 601], [1840, 618], [1875, 640], [1925, 680], [1950, 706], [1975, 760], [2000, 830], [2025, 905], [2042, 946],
];
export const SKIN = [
  [700, 60], [1000, 50], [1400, 70], [1420, 300], [1400, 520], [1372, 640], [1336, 700], [1302, 745], [1262, 790], [1230, 818],
  [860, 818], [826, 770], [796, 710], [770, 620], [742, 470], [720, 300],
];
// beanie: crown outline (the frame top cuts it at 6.04–10.5 s; the pan reveals the crown), then the cuff's lower edge
export const BEANIE = [
  [600, 372], [584, 350], [572, 300], [566, 250], [565, 180], [565, 100], [570, 20], [582, -60], [605, -140], [640, -200], [690, -242], [746, -266], [796, -288],
  [846, -304], [896, -330], [946, -344], [996, -352], [1046, -354], [1096, -353], [1146, -344], [1196, -323], [1246, -300], [1296, -272], [1346, -233],
  [1396, -170], [1440, -100], [1472, -20], [1492, 60], [1502, 150], [1504, 240], [1500, 290], [1492, 330], [1478, 357],
  [1468, 332], [1458, 295], [1440, 248], [1420, 215], [1400, 199], [1380, 178], [1360, 164], [1340, 151], [1320, 141], [1300, 130], [1280, 121], [1260, 115], [1240, 109],
  [1220, 101], [1160, 90], [1100, 84], [1000, 83], [980, 85], [940, 92], [900, 99], [880, 103], [860, 107], [840, 113], [820, 117], [800, 126], [780, 133],
  [760, 143], [740, 156], [720, 170], [700, 179], [680, 202], [660, 224], [640, 265], [625, 300], [612, 340],
];
const CUFF_EDGE = BEANIE.slice(32).concat([[600, 372]]).reverse();          // left to right along the lower edge
const FOLD = [[572, 60], [600, 10], [650, -35], [720, -72], [800, -97], [846, -106], [946, -128], [1046, -137], [1146, -131], [1246, -112], [1330, -76], [1400, -36], [1458, 18], [1494, 90]];
export const LAPTOP = { x0: 230, x1: 1888, y: 813, r: 30 };

const poly = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
const flatPoly = (f) => (c) => { c.moveTo(f[0], f[1]); for (let i = 2; i < f.length; i += 2) c.lineTo(f[i], f[i + 1]); c.closePath(); };
const blob = (pts) => (c) => smoothPath(c, pts, true);
function fillPath(g, path, style) { g.beginPath(); path(g); g.fillStyle = style; g.fill(); }
function clipTo(g, path, fn) { g.save(); g.beginPath(); path(g); g.clip(); fn(); g.restore(); }

// a tapered ink stroke through control points: full weight near the start, tapering to a hair
export function strand(g, pts, w, color, { per = 6, head = 0.12, pow = 0.8 } = {}) {
  const q = sampleCurve(pts, per);
  taper(g, q, (u) => w * Math.min(1, u / head + 0.25) * Math.pow(1 - u, pow), color);
}
// a swelling ink line (thin ends)
export function line(g, pts, w, color, { per = 6, end = 0.25, pow = 0.6 } = {}) {
  const q = pts.length > 2 ? sampleCurve(pts, per) : pts;
  taper(g, q, (u) => w * (end + (1 - end) * Math.pow(Math.sin(PI * u), pow)), color);
}
// a strand pointed at both ends, fullest at `peak`
function lockLine(g, pts, w, color, { per = 6, peak = 0.3 } = {}) {
  const q = pts.length > 2 ? sampleCurve(pts, per) : pts;
  taper(g, q, (u) => w * (u < peak ? 0.15 + 0.85 * u / peak : Math.pow((1 - u) / (1 - peak), 0.8)), color);
}
// hatch strokes: n short strokes scattered in an ellipse, all along a direction
function hatchPatch(g, cx, cy, rx, ry, ang, n, len, w, color, seed, jit = 0.25) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    let x, y;
    do { x = r() * 2 - 1; y = r() * 2 - 1; } while (x * x + y * y > 1);
    const a = ang + (r() - 0.5) * jit, L = len * (0.6 + 0.8 * r());
    const px = cx + x * rx - Math.cos(a) * L * 0.5, py = cy + y * ry - Math.sin(a) * L * 0.5;
    line(g, [[px, py], [px + Math.cos(a) * L * 0.5, py + Math.sin(a) * L * 0.5], [px + Math.cos(a) * L, py + Math.sin(a) * L]], w * (0.6 + 0.6 * r()), color, { per: 3, end: 0.1 });
  }
}
// rows of strokes that follow a guide curve (offset rows): each stroke leaves the curve at angle `ang` to its tangent
function combRows(g, guide, rows, gap, len, ang, w, color, seed, { step = 7, jitter = 0.4, skip = 0.15, taperIn = false } = {}) {
  const r = rng(seed);
  const q = sampleCurve(guide, 12);
  for (let k = 0; k < rows; k++) {
    let acc = 0;
    for (let i = 1; i < q.length; i++) {
      const dx = q[i][0] - q[i - 1][0], dy = q[i][1] - q[i - 1][1], d = Math.hypot(dx, dy) || 1;
      acc += d;
      if (acc < step) continue;
      acc = 0;
      if (r() < skip) continue;
      const nx = -dy / d, ny = dx / d;
      const px = q[i][0] + nx * gap * k + (r() - 0.5) * step * jitter, py = q[i][1] + ny * gap * k + (r() - 0.5) * step * jitter;
      const a = Math.atan2(dy, dx) + ang + (r() - 0.5) * 0.2, L = len * (0.6 + 0.7 * r());
      const pts = [[px, py], [px + Math.cos(a) * L * 0.5, py + Math.sin(a) * L * 0.5], [px + Math.cos(a) * L, py + Math.sin(a) * L]];
      if (taperIn) line(g, pts, w * (0.6 + 0.6 * r()), color, { per: 3, end: 0.1 });
      else strand(g, pts, w * (0.6 + 0.6 * r()), color, { per: 3, head: 0.25 });
    }
  }
}
// strokes following a curve, offset sideways (a band of parallel strokes along a guide, e.g. under-eye bags)
function alongBand(g, guide, n, spread, w, color, seed, { minL = 0.35, maxL = 0.9, bias = 0 } = {}) {
  const r = rng(seed);
  const q = sampleCurve(guide, 10);
  const N = q.length;
  const nrm = (i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(N - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; return [-dy / d, dx / d]; };
  for (let k = 0; k < n; k++) {
    const off = (r() + bias - 0.5) * spread, Lf = minL + (maxL - minL) * r(), s0 = r() * (1 - Lf);
    const i0 = Math.floor(s0 * (N - 1)), i1 = Math.min(N - 1, Math.floor((s0 + Lf) * (N - 1)));
    if (i1 - i0 < 2) continue;
    const pts = [];
    for (let i = i0; i <= i1; i++) { const nn = nrm(i); pts.push([q[i][0] + nn[0] * off, q[i][1] + nn[1] * off]); }
    taper(g, pts, (u) => w * (0.6 + 0.6 * r() * 0 + 0.4) * Math.pow(Math.sin(PI * u), 0.7), color);
  }
}

// ---------- the hoodie ----------
const SH_L = [[20, 930], [50, 860], [80, 800], [100, 750], [125, 690], [150, 650], [200, 622], [250, 600], [300, 582], [350, 565], [400, 548], [450, 530], [500, 502], [550, 486], [585, 470], [640, 452]];
const SH_R = [[1450, 480], [1500, 486], [1550, 515], [1600, 545], [1650, 565], [1700, 580], [1750, 590], [1800, 601], [1840, 618], [1875, 640], [1925, 680], [1950, 706], [1975, 760], [2000, 830], [2025, 905], [2042, 946]];
export function paintHoodie(g) {
  const path = poly(HOODIE);
  // measured means at 8.0 s: 167/255 at (450–750, 560–760), 193 at (1500–1800, 560–760), 127 / 136 on the far sides
  fillPath(g, path, (() => { const r = g.createLinearGradient(0, 0, 2040, 0); r.addColorStop(0, gv(0.7)); r.addColorStop(0.1, gv(0.76)); r.addColorStop(0.3, gv(0.84)); r.addColorStop(0.5, gv(0.88)); r.addColorStop(0.75, gv(0.9)); r.addColorStop(0.9, gv(0.82)); r.addColorStop(1, gv(0.7)); return r; })());
  clipTo(g, path, () => {
    // the cross-hatched band along the top of each shoulder (two families of strokes ~5–6 px apart)
    for (const [edge, seed, sd] of [[SH_L, 21, -1], [SH_R, 22, 1]]) {
      const q = sampleCurve(edge, 8);
      const r = rng(seed);
      for (let i = 1; i < q.length; i += 1) {
        const a = q[i - 1], b = q[i], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
        const tx = dx / d, ty = dy / d, nx = -ty * -sd, ny = tx * -sd;          // normal pointing into the cloth
        const inward = ny > 0 ? [nx, ny] : [-nx, -ny];
        for (let s = 0; s < d; s += 5.2) {
          const px = a[0] + tx * s, py = a[1] + ty * s;
          const L = 30 + r() * 30;
          for (const turn of [0.55, -0.55]) {
            const ang = Math.atan2(inward[1], inward[0]) + turn + (r() - 0.5) * 0.15;
            if (r() < 0.12) continue;
            line(g, [[px, py], [px + Math.cos(ang) * L, py + Math.sin(ang) * L]], 1.2 + r() * 0.5, gv(0.05, 0.45 + 0.3 * r()), { end: 0.35, pow: 0.5 });
          }
        }
      }
      // comb strokes hanging from the band: long, tapered, slanting down and out
      for (let i = 0; i < 520; i++) {
        const p = q[Math.floor(r() * q.length)];
        const x = p[0] + (r() - 0.5) * 16, y = p[1] + 26 + r() * 40, L = 40 + r() * r() * 190;
        const a = PI / 2 + sd * (0.12 + 0.35 * r()) * (p[1] > 700 ? 0.3 : 1) + (p[1] > 700 ? sd * -0.5 : 0);
        strand(g, [[x, y], [x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.5 + 2], [x + Math.cos(a) * L, y + Math.sin(a) * L]], 0.9 + 0.8 * r(), gv(0.08, 0.25 + 0.35 * r()), { per: 3, head: 0.12 });
      }
    }
    // the outer sides turn away from the light: dense diagonal hatching toward the edges
    for (const [pts, ang, seed] of [
      [[[0, 946], [20, 930], [50, 860], [80, 800], [100, 750], [125, 690], [150, 650], [200, 640], [240, 700], [260, 820], [250, 946]], -1.05, 11],
      [[[2042, 946], [2025, 905], [2000, 830], [1975, 760], [1950, 706], [1925, 680], [1875, 650], [1830, 700], [1820, 820], [1850, 946]], -2.05, 12],
    ]) {
      clipTo(g, blob(pts), () => {
        const r = rng(seed);
        for (let i = 0; i < 420; i++) {
          const x = pts.reduce((m, p) => Math.min(m, p[0]), 1e9) - 60 + r() * 360, y = 600 + r() * 380, L = 30 + r() * 70;
          line(g, [[x, y], [x + Math.cos(ang) * L, y + Math.sin(ang) * L]], 1.1 + r() * 0.7, gv(0.06, 0.45), { end: 0.3 });
        }
      });
    }
    // a few long fold lines down the chest and the seams
    for (const f of [[[420, 640], [470, 720], [520, 800]], [[330, 690], [360, 760], [400, 815]], [[1600, 650], [1585, 730], [1570, 810]], [[1700, 670], [1690, 745], [1700, 815]], [[1480, 700], [1455, 770]], [[640, 700], [665, 770]]]) {
      line(g, f, 1.4, gv(0.1, 0.45));
    }
  });
  // outline of the shoulders
  line(g, SH_L, 2.6, INKC, { end: 0.5 });
  line(g, SH_R, 2.6, INKC, { end: 0.5 });
}

// ---------- the face (skin, sockets, brows, nose, mouth, stubble, jaw) ----------
export function paintFace(g) {
  fillPath(g, poly(SKIN), gv(SKINV));
  // the neck under the jaw on both sides, in shadow: hatched grey
  for (const [pts, ang, seed] of [[[[770, 700], [826, 745], [870, 818], [760, 818], [745, 740]], 0.85, 41], [[[1336, 700], [1302, 745], [1262, 790], [1230, 818], [1350, 818], [1360, 740]], 2.3, 42]]) {
    clipTo(g, poly(pts), () => { hatchPatch(g, pts[0][0] + (ang < 1 ? 20 : -20), 770, 70, 60, ang, 90, 34, 1.2, gv(0.1, 0.55), seed); });
  }
  // cheek contour hatching along the hair: long fine diagonal strokes (measured 790–830 x 580–720, 1270–1330 x 570–720)
  hatchPatch(g, 808, 650, 22, 75, 1.05, 34, 46, 1.0, gv(0.12, 0.55), 43);
  hatchPatch(g, 1300, 645, 26, 80, 2.1, 38, 50, 1.0, gv(0.12, 0.55), 44);
  hatchPatch(g, 1322, 470, 14, 60, 2.2, 16, 40, 0.9, gv(0.15, 0.45), 45);
  hatchPatch(g, 770, 470, 12, 60, 1.0, 14, 36, 0.9, gv(0.15, 0.45), 46);
  hatchPatch(g, 1316, 480, 30, 90, 1.95, 70, 46, 1.1, gv(0.12, 0.5), 47);
  hatchPatch(g, 776, 480, 24, 90, 1.2, 50, 44, 1.0, gv(0.12, 0.45), 48);
  hatchPatch(g, 1300, 400, 20, 30, 2.1, 20, 30, 1.0, gv(0.12, 0.45), 49);
  // sockets: curved hatching under each eye (the dark bags), a crossed patch at the inner corner below the brow, a
  // band under the brow, fans at the outer corners
  for (const E of EYES) {
    const sd = E.side, [cx, cy] = E.c;
    const lo = E.lo0;
    // bags: rows of long thin strokes following the lower lid, darkest close to it
    const bag = lo.map((p, i) => [p[0], p[1] + 14 + 5 * Math.sin(PI * i / (lo.length - 1))]);
    alongBand(g, bag, 36, 12, 1.2, gv(0.06, 0.5), 50 + cx);
    alongBand(g, bag.map((p) => [p[0], p[1] + 12]), 22, 18, 1.0, gv(0.08, 0.35), 51 + cx, { minL: 0.25, maxL: 0.7 });
    alongBand(g, bag.map((p) => [p[0] + sd * 20, p[1] - 2]), 20, 8, 1.4, gv(0.05, 0.55), 52 + cx, { minL: 0.25, maxL: 0.55 });
    // over the upper lid: strokes hugging the lid crease
    const up = E.up0;
    const crease = up.map((p, i) => [p[0], p[1] - 8 - 4 * Math.sin(PI * i / (up.length - 1))]);
    alongBand(g, crease, 34, 12, 1.2, gv(0.06, 0.4), 53 + cx, { minL: 0.3, maxL: 0.8 });
    // the inner corner below the brow (toward the nose): cross-hatching (measured darkest part of the socket)
    const ix = sd < 0 ? cx + 80 : cx - 88, iy = cy - 50;
    hatchPatch(g, ix, iy, 26, 30, sd < 0 ? 2.25 : 0.9, 30, 34, 1.1, gv(0.05, 0.6), 97 + cx, 0.15);
    hatchPatch(g, ix, iy, 24, 28, sd < 0 ? 0.95 : 2.2, 26, 30, 1.0, gv(0.05, 0.55), 98 + cx, 0.15);
    hatchPatch(g, ix + (sd < 0 ? 8 : -8), cy + 10, 12, 30, PI / 2 + sd * 0.3, 16, 30, 1.0, gv(0.08, 0.5), 99 + cx, 0.2);
    // outer corner: lines fanning out
    const ox = sd < 0 ? cx - 100 : cx + 98;
    hatchPatch(g, ox, cy + 6, 12, 24, sd < 0 ? 0.55 : 2.6, 16, 28, 1.0, gv(0.08, 0.5), 90 + cx);
  }
  // brows: dense short tapered hairs along a band (measured: left 843–948 x 186–236, right 1108–1250 x 176–232)
  for (const [pts, seed, sd] of [[[[843, 192], [870, 194], [900, 202], [925, 214], [946, 234]], 101, -1], [[[1110, 228], [1135, 207], [1170, 193], [1210, 184], [1250, 180]], 102, 1]]) {
    const q = sampleCurve(pts, 16), rb = rng(seed);
    const N = q.length;
    for (let i = 0; i < 380; i++) {
      const u = rb(), j = Math.floor(u * (N - 1)), p = q[j];
      const inner = sd < 0 ? u : 1 - u;                          // 1 at the inner end (toward the nose)
      const th = 8 + 10 * Math.sin(PI * clamp(inner * 0.9 + 0.1));
      const x = p[0] + (rb() - 0.5) * 4, y = p[1] + (rb() - 0.5) * th;
      const t = q[Math.min(N - 1, j + 1)], s = q[Math.max(0, j - 1)], ta = Math.atan2(t[1] - s[1], t[0] - s[0]);
      const a = ta + (sd < 0 ? 1 : -1) * (0.15 + 0.35 * inner) * (sd < 0 ? 1 : 1) + (rb() - 0.5) * 0.3;
      const L = 10 + rb() * 14;
      const d = sd < 0 ? 1 : -1;
      strand(g, [[x - d * Math.cos(a) * L * 0.5, y - d * Math.sin(a) * L * 0.5], [x + d * Math.cos(a) * L * 0.5, y + d * Math.sin(a) * L * 0.5]], 2.4 + rb() * 1.8, INKC, { per: 2, head: 0.25 });
    }
  }
  // nose (measured at 3.5x): bridge hatching, the alae, the dark nostril commas, the underside of the tip
  hatchPatch(g, 998, 510, 12, 45, PI / 2 + 0.35, 22, 30, 1.0, gv(0.15, 0.5), 111, 0.2);
  hatchPatch(g, 1030, 490, 10, 20, PI / 2 + 0.05, 8, 26, 0.9, gv(0.2, 0.4), 116, 0.2);
  hatchPatch(g, 1098, 505, 10, 40, PI / 2 - 0.4, 18, 28, 1.0, gv(0.15, 0.45), 112, 0.2);
  line(g, [[976, 526], [968, 546], [967, 566], [972, 585], [986, 597]], 2.4, gv(0.08, 0.9), { end: 0.2 });
  line(g, [[1115, 521], [1129, 549], [1133, 574], [1126, 590], [1115, 598]], 2.4, gv(0.08, 0.9), { end: 0.2 });
  for (const [a, b] of [[[992, 584], [1016, 590]], [[1107, 585], [1084, 591]]]) {
    const q = [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 2], b];
    taper(g, sampleCurve(q, 6), (u) => 7 * Math.pow(Math.sin(PI * (0.15 + 0.85 * u)), 0.5) * (1 - 0.6 * u), INKC);
  }
  line(g, [[1014, 594], [1035, 602], [1052, 604], [1070, 601], [1086, 596]], 2.6, gv(0.1, 0.85), { end: 0.2 });
  hatchPatch(g, 1050, 610, 42, 5, 0.25, 24, 18, 0.9, gv(0.12, 0.5), 113);
  // philtrum and the little crease above the lip
  line(g, [[1053, 654], [1050, 670]], 1.1, gv(0.15, 0.5));
  line(g, [[1068, 655], [1071, 670]], 1.1, gv(0.15, 0.5));
  line(g, [[1030, 681], [1056, 684], [1082, 681]], 1.2, gv(0.15, 0.5));
  // stubble: short dark ticks round the mouth and on the chin (measured areas)
  const rs = rng(121);
  for (const [cx, cy, rx, ry, n] of [[920, 690, 40, 40, 70], [1180, 690, 45, 40, 80], [1050, 660, 70, 14, 40], [1060, 790, 130, 20, 110], [880, 780, 40, 26, 40], [1215, 780, 40, 26, 50]]) {
    for (let i = 0; i < n; i++) {
      let x, y; do { x = rs() * 2 - 1; y = rs() * 2 - 1; } while (x * x + y * y > 1);
      const px = cx + x * rx, py = cy + y * ry, L = 5 + rs() * 8, a = PI / 2 - 0.35 + (px - 1050) * 0.0015 + (rs() - 0.5) * 0.4;
      strand(g, [[px, py], [px + Math.cos(a) * L, py + Math.sin(a) * L]], 1.1 + rs() * 0.7, gv(0.1, 0.65), { per: 2, head: 0.3 });
    }
  }
  // cheek lines beside the mouth
  line(g, [[944, 610], [936, 640], [938, 672]], 1.1, gv(0.15, 0.4));
  line(g, [[1160, 610], [1168, 642], [1164, 674]], 1.1, gv(0.15, 0.4));
  // lower lip under the pencil and the chin crease (hatched)
  line(g, [[1005, 748], [1050, 753], [1100, 752], [1150, 747]], 4.0, gv(0.1, 0.75), { end: 0.2 });
  combRows(g, [[1010, 752], [1060, 756], [1120, 752]], 1, 3, 9, PI / 2, 1.0, gv(0.1, 0.5), 119, { step: 4, taperIn: true });
  combRows(g, [[978, 774], [1015, 786], [1055, 792], [1095, 787], [1140, 774]], 2, 5, 12, PI / 2, 1.2, gv(0.1, 0.55), 115, { step: 4, taperIn: true });
  line(g, [[1000, 784], [1055, 794], [1110, 784]], 1.4, gv(0.1, 0.6), { end: 0.1 });
  // jaw lines down to the laptop (measured: left (826,748)->(888,815), right (1300,746)->(1225,815))
  lockLine(g, [[822, 742], [852, 778], [890, 816]], 6, INKC, { peak: 0.6 });
  lockLine(g, [[806, 760], [830, 790], [850, 818]], 2.2, gv(0.1, 0.8), { peak: 0.6 });
  lockLine(g, [[1302, 742], [1265, 780], [1224, 817]], 6, INKC, { peak: 0.6 });
  lockLine(g, [[1316, 758], [1292, 790], [1270, 818]], 2.2, gv(0.1, 0.8), { peak: 0.6 });
}

// ---------- hair ----------
function fillMass(g, outer, gaps) {
  g.beginPath(); flatPoly(outer)(g); for (const h of gaps) flatPoly(h)(g);
  g.fillStyle = INKC; g.fill("evenodd");
}
// the light gaps inside the masses (measured 70–185/255): lit strands, drawn as dense light lines along the flow on a
// dark ground, so they read as bundles of wet hair rather than flat grey
function litGaps(g) {
  const gapPath = (c) => { for (const p of HAIR) for (const h of p.h) flatPoly(h)(c); };
  g.beginPath(); gapPath(g); g.fillStyle = gv(0.3); g.fill();
  partings(g, gapPath, FLOW_L, 241, { n: 30, gap: 3.4, w: 1.3, alpha: 0.8, long: true });
  partings(g, gapPath, FLOW_R, 242, { n: 30, gap: 3.4, w: 1.3, alpha: 0.8, long: true });
  partings(g, gapPath, FLOW_F, 243, { n: 22, gap: 3.4, w: 1.2, alpha: 0.8, long: true });
}
// flow guides (root under the cuff -> tip): thin light partings are strung along them inside the masses
const FLOW_L = [
  [[880, 105], [840, 150], [790, 210], [754, 282], [738, 380], [742, 500], [760, 620], [775, 700]],
  [[820, 118], [770, 170], [722, 240], [694, 330], [684, 430], [692, 540], [702, 640], [716, 700]],
  [[744, 150], [702, 200], [664, 270], [638, 360], [630, 460], [640, 560], [650, 640]],
  [[684, 196], [642, 258], [612, 340], [594, 430], [592, 520], [602, 610]],
  [[626, 284], [596, 350], [574, 420], [564, 500], [566, 560]],
];
const FLOW_R = [
  [[1200, 95], [1240, 150], [1290, 230], [1330, 310], [1352, 400], [1352, 500], [1342, 600], [1330, 700]],
  [[1262, 115], [1312, 180], [1360, 260], [1392, 350], [1402, 450], [1402, 560], [1396, 660]],
  [[1332, 145], [1382, 210], [1420, 290], [1446, 380], [1456, 480], [1452, 580], [1442, 660]],
  [[1402, 200], [1440, 260], [1470, 340], [1490, 420], [1500, 500], [1510, 560]],
  [[1452, 262], [1480, 320], [1500, 380], [1520, 460], [1540, 520]],
];
const FLOW_F = [
  [[1092, 95], [1062, 180], [1032, 260], [1002, 330], [972, 400], [936, 452]],
  [[1044, 90], [1032, 170], [1007, 260], [986, 330], [962, 400]],
  [[996, 92], [992, 170], [982, 250], [972, 320]],
];
function partings(g, clip, guides, seed, { n = 10, gap = 6, w = 1.4, alpha = 0.7, long = false } = {}) {
  clipTo(g, clip, () => {
    const r = rng(seed);
    for (const G of guides) {
      const q = sampleCurve(G, 8), N = q.length;
      const nrm = (i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(N - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; return [-dy / d, dx / d]; };
      for (let k = 0; k < n; k++) {
        const off = (k - (n - 1) / 2) * gap + (r() - 0.5) * gap * 0.8;
        const s0 = long ? 0 : r() * 0.5, s1 = long ? 1 : Math.min(1, s0 + 0.25 + r() * 0.6);
        const i0 = Math.floor(s0 * (N - 1)), i1 = Math.floor(s1 * (N - 1));
        if (i1 - i0 < 3) continue;
        const pts = [];
        const wob = (r() - 0.5) * 0.02;
        for (let i = i0; i <= i1; i++) { const nn = nrm(i), o = off * (1 + wob * (i - i0)); pts.push([q[i][0] + nn[0] * o, q[i][1] + nn[1] * o]); }
        taper(g, pts, (u) => (w * (0.5 + r() * 0 + 0.5)) * Math.pow(Math.sin(PI * u), 0.8), wv(alpha * (0.5 + 0.5 * r())));
      }
    }
  });
}
// loose strands over the skin (points, width): measured on the 2–4x grids of the forehead
const LOOSE = [
  // left of the forelock: the long thin strand down past the left eye's inner corner, and two finer ones
  [[[957, 94], [944, 160], [940, 234], [945, 309], [951, 356]], 4.2],
  [[[936, 96], [918, 156], [910, 212]], 2.0],
  [[[926, 97], [902, 146], [886, 186]], 1.8],
  // right of the forelock: long thin strands falling to below the eyes
  [[[1072, 150], [1046, 250], [1026, 330], [1008, 420], [1000, 470]], 1.8],
  [[[1090, 130], [1062, 270], [1034, 380], [1017, 470]], 1.6],
  [[[1102, 100], [1092, 170], [1072, 250]], 2.0],
  [[[1108, 92], [1106, 160], [1100, 220]], 1.5],
  // thin tails under the forelock's tip
  [[[992, 372], [978, 430], [968, 472]], 1.5], [[[1006, 380], [1000, 436], [996, 482]], 1.3], [[[1016, 372], [1016, 428], [1010, 470]], 1.2],
  [[[962, 400], [946, 440], [928, 462]], 1.6], [[[976, 392], [962, 440], [952, 480]], 1.3],
  // right forehead: fine strands from the cuff toward the right eye
  [[[1184, 96], [1199, 182], [1216, 219], [1233, 248], [1246, 268]], 1.5],
  [[[1176, 98], [1179, 139], [1190, 182]], 1.4],
  [[[1206, 98], [1228, 160], [1262, 220], [1292, 268]], 2.2],
  // left fringe over the eye's upper-left
  [[[850, 198], [800, 248], [760, 283]], 3.0], [[[830, 198], [787, 238], [755, 278]], 2.4], [[[866, 196], [826, 240], [792, 272]], 1.6],
];
// flyaways: thin strands spilling from the lock tips onto the hoodie (measured areas)
function flyaways(g, seed) {
  const r = rng(seed);
  for (const [x0, x1, y0, y1, dir, n] of [[560, 640, 560, 640, -1, 16], [640, 740, 620, 690, -1, 14], [1340, 1420, 620, 690, 1, 12], [1440, 1560, 520, 640, 1, 18]]) {
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), L = 30 + r() * 70;
      const dx = dir * (0.1 + 0.5 * r()) * L, dy = L;
      strand(g, [[x, y], [x + dx * 0.4, y + dy * 0.5], [x + dx, y + dy]], 1.0 + r() * 1.6, INKC, { per: 6, head: 0.05 });
    }
  }
}
export function paintHair(g) {
  for (const p of HAIR) fillMass(g, p.o, p.h);
  litGaps(g);
  // thin light partings inside the masses (the wet sheen), along the flow
  const clip = flatPoly(HAIR_MAIN);
  partings(g, clip, FLOW_L, 211, { n: 12, gap: 5.5, w: 1.0, alpha: 0.7 });
  partings(g, clip, FLOW_R, 212, { n: 10, gap: 6, w: 1.0, alpha: 0.6 });
  partings(g, clip, FLOW_F, 213, { n: 9, gap: 4.5, w: 1.0, alpha: 0.7 });
  for (const [pts, w] of LOOSE) lockLine(g, pts, w, INKC, { peak: 0.25 });
  flyaways(g, 231);
}

// ---------- beanie ----------
const beaniePath = (c) => { c.moveTo(BEANIE[0][0], BEANIE[0][1]); for (const p of BEANIE) c.lineTo(p[0], p[1]); c.closePath(); };
const cuffPath = (c) => {
  c.moveTo(FOLD[0][0], FOLD[0][1]); for (const p of FOLD) c.lineTo(p[0], p[1]);
  c.lineTo(1504, 240); c.lineTo(1500, 290); for (const p of BEANIE.slice(31)) c.lineTo(p[0], p[1]); c.lineTo(600, 372); c.lineTo(584, 350); c.lineTo(572, 300); c.lineTo(566, 250); c.lineTo(565, 180); c.lineTo(565, 100); c.closePath();
};
export function paintBeanie(g) {
  // crown: mid grey, falling dark toward its top and sides (measured at 12.52 s: ~40–90 near the top, 110–140 low)
  fillPath(g, beaniePath, (() => { const r = g.createRadialGradient(1040, 40, 60, 1040, -40, 560); r.addColorStop(0, gv(0.56)); r.addColorStop(0.55, gv(0.46)); r.addColorStop(0.85, gv(0.26)); r.addColorStop(1, gv(0.12)); return r; })());
  clipTo(g, beaniePath, () => {
    // faint knit ribs on the crown, converging on the top
    const r0 = rng(300);
    for (let i = 0; i < 70; i++) {
      const x = 590 + i * 13.5 + (r0() - 0.5) * 3;
      const pts = [[x, -60], [x + (1040 - x) * 0.25, -200], [x + (1040 - x) * 0.55, -340]];
      line(g, pts, 2.2, gv(0.05, 0.28 + 0.2 * r0()), { end: 0.4 });
    }
    // the cuff: lit knit (~0.6) with ribs fanning round the head from a centre below the chin
    clipTo(g, cuffPath, () => {
      fillPath(g, cuffPath, (() => { const r = g.createLinearGradient(565, 0, 1505, 0); r.addColorStop(0, gv(0.16)); r.addColorStop(0.06, gv(0.3)); r.addColorStop(0.18, gv(0.52)); r.addColorStop(0.42, gv(0.64)); r.addColorStop(0.62, gv(0.64)); r.addColorStop(0.84, gv(0.52)); r.addColorStop(0.95, gv(0.3)); r.addColorStop(1, gv(0.16)); return r; })());
      // pale mottled patches (the knit catching light)
      const rm = rng(304);
      for (let i = 0; i < 140; i++) {
        const x = 640 + rm() * 800, y = -120 + rm() * 260, rr = 6 + rm() * 14;
        g.fillStyle = gv(0.85, 0.12 + 0.12 * rm()); g.beginPath(); g.ellipse(x, y, rr, rr * 0.6, rm() * PI, 0, 2 * PI); g.fill();
      }
      // ribs: evenly spaced round the head (angle th), so they crowd together and run parallel to the silhouette on
      // the sides; each rib runs from the cuff's lower edge up to the fold
      const r = rng(301);
      const edgeY = (x) => { const e = CUFF_EDGE; for (let i = 1; i < e.length; i++) if (x <= e[i][0]) { const a = e[i - 1], b = e[i], u = (x - a[0]) / Math.max(1e-6, b[0] - a[0]); return a[1] + (b[1] - a[1]) * u; } return e[e.length - 1][1]; };
      const foldY = (x) => { const e = FOLD; for (let i = 1; i < e.length; i++) if (x <= e[i][0]) { const a = e[i - 1], b = e[i], u = (x - a[0]) / Math.max(1e-6, b[0] - a[0]); return a[1] + (b[1] - a[1]) * u; } return e[e.length - 1][1]; };
      const NR = 136;
      for (let i = 0; i < NR; i++) {
        const th = -1.48 + 2.96 * i / (NR - 1), sn = Math.sin(th), edge = Math.abs(sn);
        const xe = clamp(1040 + 452 * sn, 591, 1484), xf = clamp(1034 + 462 * sn, 573, 1493);
        const ye = edgeY(xe) + 4, yf = foldY(xf) - 4;
        const bow = 10 * sn;
        const pts = [[xe, ye], [(xe + xf) / 2 + bow + (r() - 0.5) * 2, (ye + yf) / 2], [xf, yf]];
        line(g, pts, 2.3 + 0.8 * edge * edge, gv(0.05, 0.7 + 0.25 * edge), { end: 0.6, pow: 0.3 });
        // on the shaded sides the knit shows as pale curved ribs on dark (measured 570–610 and 1470–1500, y 200–370)
        if (edge > 0.8) line(g, pts.map(([x, y]) => [x + 3 * Math.sign(sn), y]), 1.6, gv(0.75, 0.55 * (edge - 0.8) / 0.2), { end: 0.4, pow: 0.4 });
      }
      // knit stitches between the ribs: short pale ticks
      for (let i = 0; i < 1600; i++) {
        const sn = Math.sin(-1.4 + 2.8 * r()), xe = 1040 + 450 * sn, u = r();
        const ye = edgeY(clamp(xe, 591, 1484)), yf = foldY(clamp(1034 + 462 * sn, 573, 1493));
        const x = xe + (1034 + 462 * sn - xe) * u, y = ye + (yf - ye) * u;
        g.fillStyle = gv(0.9, 0.18 + 0.22 * r()); g.fillRect(x - 1.3, y - 2, 2.6, 3.4);
      }
      // cross-hatched knit patches on the shaded sides (measured 580–820 x 0–220, 1300–1480 x 0–220): two families of
      // regular strokes crossing the ribs, faded out at the patch edge
      for (const [cx, cy, rx, ry, a0, seed] of [[690, 70, 130, 120, 0.7, 311], [820, 0, 100, 70, 0.9, 312], [930, -40, 70, 50, 1.1, 317], [1390, 70, 110, 120, 2.45, 313], [1290, -10, 80, 70, 2.3, 314], [612, 210, 45, 120, 1.2, 315], [1468, 210, 40, 120, 1.95, 316]]) {
        const rc = rng(seed);
        for (const a of [a0, a0 + 1.25]) {
          const ca = Math.cos(a), sa = Math.sin(a), R = Math.max(rx, ry) * 1.2;
          for (let o = -R; o <= R; o += 10.5) {
            const px = cx - sa * o, py = cy + ca * o;
            const L = Math.sqrt(Math.max(0, R * R - o * o)) * (0.6 + 0.5 * rc());
            if (L < 8) continue;
            const q = [[px - ca * L, py - sa * L], [px, py], [px + ca * L, py + sa * L]].map(([x, y]) => [x + (rc() - 0.5) * 2, y + (rc() - 0.5) * 2]);
            // fade by distance from the patch centre (elliptical)
            const d = Math.hypot((px - cx) / rx, (py - cy) / ry);
            if (d > 1.1) continue;
            if (rc() < 0.45) continue;
            line(g, q, 2.0 + 0.6 * rc(), gv(0.04, 0.8 * (1 - 0.5 * d)), { end: 0.15, pow: 0.4 });
          }
        }
      }
    });
  });
  // fold line between crown and cuff, the heavy shadow line of the cuff over the hair, the outline
  line(g, FOLD, 3.4, INKC, { end: 0.4 });
  line(g, CUFF_EDGE, 5.5, INKC, { end: 0.5, per: 8 });
  line(g, BEANIE.slice(0, 33), 2.4, INKC, { end: 0.6, per: 10 });
}

// ---------- sweat (drawn per frame): a hooked stroke, no fill; top and bottom points ----------
// measured at 6.08 s and 8.20 s (cheek beads slide ~27 px; the one by the nose ~13 px)
export const DROPS = [
  { top: [814, 484], bot: [819, 521], dy: 27, dx: 2, slide: "a" },
  { top: [1271, 488], bot: [1275, 513], dy: 25, dx: 3, slide: "a", grow: 12 },
  { top: [1110, 398], bot: [1116, 422], dy: 13, dx: 1, slide: "b" },
  { top: [799, 441], bot: [802, 446], dy: 0, small: true },
  { top: [915, 145], bot: [917, 162] },
  { top: [1139, 143], bot: [1144, 167] },
  { top: [1164, 106], bot: [1168, 121] },
];
export function drop(g, top, bot, s = 1) {
  const h = bot[1] - top[1], w = Math.max(5, h * 0.3) * s;
  const pts = [top, [top[0] + (bot[0] - top[0]) * 0.3 - 1, top[1] + h * 0.45], [bot[0] - w * 0.45, bot[1] - w * 0.55], [bot[0], bot[1]], [bot[0] + w * 0.45, bot[1] - w * 0.5], [bot[0] + w * 0.55, bot[1] - w * 1.3]];
  const q = sampleCurve(pts, 5);
  taper(g, q, (u) => (u < 0.55 ? 0.4 + 2.6 * u / 0.55 : 3.0 - 1.9 * (u - 0.55) / 0.45) * Math.max(0.6, s), gv(0.12, 0.85));
}

// ---------- pencil ----------
export function paintPencil(g) {
  const y0 = 711, y1 = 745, yc = (y0 + y1) / 2;
  // body (pale wood with a faint grain), from the sharpened cone to the ferrule
  g.beginPath(); g.moveTo(795, y0 + 1); g.lineTo(1312, y0 - 1); g.lineTo(1312, y1 - 1); g.lineTo(795, y1 + 1); g.closePath();
  const bg = g.createLinearGradient(0, y0, 0, y1); bg.addColorStop(0, gv(0.9)); bg.addColorStop(0.35, gv(0.82)); bg.addColorStop(0.7, gv(0.68)); bg.addColorStop(1, gv(0.55));
  g.fillStyle = bg; g.fill();
  line(g, [[800, 722], [1305, 720]], 1.2, gv(0.3, 0.6));
  line(g, [[800, 735], [1305, 733]], 1.2, gv(0.25, 0.6));
  const r = rng(401);
  for (let i = 0; i < 60; i++) { const x = 800 + r() * 490, y = y0 + 3 + r() * (y1 - y0 - 6); line(g, [[x, y], [x + 20 + r() * 50, y + (r() - 0.5)]], 1, gv(0.25, 0.45)); }
  // sharpened cone and the lead
  g.beginPath(); g.moveTo(795, y0 + 1); g.lineTo(707, yc + 1); g.lineTo(795, y1 + 1); g.closePath();
  const cg = g.createLinearGradient(0, y0, 0, y1); cg.addColorStop(0, gv(0.9)); cg.addColorStop(1, gv(0.7));
  g.fillStyle = cg; g.fill();
  for (let i = 0; i < 6; i++) line(g, [[722 + i * 12, yc - 2 + i * 0.3], [790, yc - 12 + i * 4]], 0.9, gv(0.3, 0.5));
  g.beginPath(); g.moveTo(735, yc - 6); g.lineTo(707, yc + 1); g.lineTo(735, yc + 7); g.closePath(); g.fillStyle = gv(0.15); g.fill();
  // scalloped edge where the paint meets the cone
  g.strokeStyle = INKC; g.lineWidth = 2;
  g.beginPath(); g.moveTo(795, y0 + 1); for (let k = 0; k <= 4; k++) { const yy = y0 + 1 + k * (y1 - y0) / 4; g.lineTo(k % 2 ? 787 : 796, yy); } g.stroke();
  // ferrule (metal band, ringed) and eraser
  g.beginPath(); g.rect(1312, y0 - 3, 48, y1 - y0 + 5);
  const fg = g.createLinearGradient(0, y0 - 3, 0, y1 + 2); fg.addColorStop(0, gv(0.92)); fg.addColorStop(0.4, gv(0.72)); fg.addColorStop(0.8, gv(0.42)); fg.addColorStop(1, gv(0.58));
  g.fillStyle = fg; g.fill();
  for (const x of [1318, 1326, 1344, 1352]) line(g, [[x, y0 - 2], [x, y1 + 1]], 1.4, gv(0.15, 0.8));
  g.beginPath(); g.roundRect(1360, y0 - 1, 32, y1 - y0 + 1, [0, 6, 6, 0]);
  const eg = g.createLinearGradient(0, y0, 0, y1); eg.addColorStop(0, gv(0.88)); eg.addColorStop(1, gv(0.6));
  g.fillStyle = eg; g.fill();
  g.strokeStyle = INKC; g.lineWidth = 2.2; g.lineJoin = "round";
  g.beginPath(); g.moveTo(707, yc + 1); g.lineTo(795, y0 + 1); g.lineTo(1312, y0 - 1); g.moveTo(707, yc + 1); g.lineTo(795, y1 + 1); g.lineTo(1312, y1 - 1); g.stroke();
  g.strokeRect(1312, y0 - 3, 48, y1 - y0 + 5);
  g.beginPath(); g.roundRect(1360, y0 - 1, 32, y1 - y0 + 1, [0, 6, 6, 0]); g.stroke();
}
// the mouth over the pencil: dark gap at the corners, five upper teeth biting down on it (measured 972–1130 x 699–725),
// the upper lip line and its hatching
export function paintMouth(g) {
  for (const [x0, x1, sd] of [[944, 978, -1], [1124, 1156, 1]]) {
    g.beginPath(); smoothPath(g, [[x0, 701], [(x0 + x1) / 2, 699], [x1, 700], [(x0 + x1) / 2 + sd * 6, 709]], true); g.fillStyle = gv(0.15, 0.9); g.fill();
  }
  const teeth = [[974, 993, 716], [993, 1010, 720], [1010, 1053, 724], [1053, 1100, 724], [1100, 1128, 718]];
  for (const [a, b, bot] of teeth) {
    g.beginPath(); g.moveTo(a + 1, 700); g.lineTo(b - 1, 700); g.lineTo(b - 1, bot - 7); g.quadraticCurveTo(b - 2, bot, (a + b) / 2, bot); g.quadraticCurveTo(a + 2, bot, a + 1, bot - 7); g.closePath();
    const tg = g.createLinearGradient(0, 700, 0, bot); tg.addColorStop(0, gv(0.8)); tg.addColorStop(0.4, gv(0.95)); tg.addColorStop(1, gv(0.97));
    g.fillStyle = tg; g.fill(); g.strokeStyle = gv(0.1, 0.85); g.lineWidth = 1.4; g.stroke();
  }
  // the lip line: a swelling dark stroke, the corners turning down a touch; hatching on the upper lip and at the corners
  line(g, [[940, 704], [972, 698], [1015, 698], [1050, 701], [1085, 698], [1128, 698], [1160, 704]], 2.8, INKC, { end: 0.25, pow: 0.5 });
  alongBand(g, [[960, 690], [1000, 686], [1050, 688], [1100, 686], [1140, 690]], 24, 8, 0.9, gv(0.1, 0.45), 114);
  hatchPatch(g, 935, 700, 18, 8, 0.35, 10, 20, 1.0, gv(0.1, 0.5), 117);
  hatchPatch(g, 1165, 700, 18, 8, 2.8, 10, 20, 1.0, gv(0.1, 0.5), 118);
}

// ---------- laptop lid ----------
export function paintLaptop(g) {
  const { x0, x1, y, r } = LAPTOP;
  g.beginPath(); g.moveTo(x0, 960); g.lineTo(x0, y + r); g.quadraticCurveTo(x0, y, x0 + r, y); g.lineTo(x1 - r, y); g.quadraticCurveTo(x1, y, x1, y + r); g.lineTo(x1, 960); g.closePath();
  g.fillStyle = "#040404"; g.fill();
  // the lit bevel along the top edge: a pale band with a thin darker line inside it (measured 8.0 s)
  g.fillStyle = gv(0.62); g.fillRect(x0 + 8, y + 3, x1 - x0 - 16, 13);
  g.fillStyle = gv(0.3, 0.8); g.fillRect(x0 + 8, y + 9, x1 - x0 - 16, 1.6);
  const r2 = rng(501);
  for (let i = 0; i < 30; i++) { const x = x0 + 40 + r2() * (x1 - x0 - 80), yy = y + 4 + r2() * 11; line(g, [[x, yy], [x + 30 + r2() * 90, yy]], 1.2, gv(0.95, 0.5)); }
  { const pts = []; for (let i = 0; i <= 60; i++) pts.push([x0 + r * 0.4 + (x1 - x0 - r * 0.8) * i / 60, y + 2]); taper(g, [[x0 + 2, y + r + 10], [x0 + 2, y + r * 0.4], ...pts, [x1 - 2, y + r * 0.4], [x1 - 2, y + r + 10]], 3, INKC); }
}

// ---------- the eyes ----------
// state: { dx, dy (iris offset px), look: 0 (stare) .. 1 (the narrowed look to screen-right) }
// measured at 6.08 s (4.5x grids): left opening 752–938 x 278–362, iris (851,323) r 28, pupil r 7; right opening
// 1143–1325 x 273–360, iris (1233,318). Looking right (10.0 s): upper lids drop ~20 px, irises at (895,330) / (1270,328).
const EYES = [
  { c: [851, 323], side: -1,
    up0: [[752, 336], [768, 310], [795, 290], [830, 280], [865, 279], [900, 288], [924, 308], [938, 338]],
    lo0: [[752, 338], [780, 352], [815, 360], [850, 363], [890, 359], [918, 351], [938, 342]],
    up1: [[752, 338], [770, 318], [800, 304], [835, 298], [870, 297], [902, 301], [925, 315], [938, 338]],
    lo1: [[752, 339], [780, 353], [815, 361], [850, 364], [890, 360], [918, 352], [938, 342]],
    iris1: [895, 330] },
  { c: [1233, 318], side: 1,
    up0: [[1143, 341], [1156, 312], [1180, 290], [1215, 277], [1250, 275], [1283, 283], [1308, 300], [1325, 322]],
    lo0: [[1143, 343], [1175, 354], [1210, 360], [1245, 361], [1280, 355], [1306, 344], [1325, 325]],
    up1: [[1143, 341], [1158, 318], [1185, 302], [1220, 295], [1255, 294], [1287, 299], [1310, 309], [1325, 324]],
    lo1: [[1143, 344], [1175, 355], [1210, 361], [1245, 362], [1280, 356], [1306, 345], [1325, 326]],
    iris1: [1270, 328] },
];
const mixPts = (a, b, t) => a.map((p, i) => [p[0] + (b[i][0] - p[0]) * t, p[1] + (b[i][1] - p[1]) * t]);
export const EYE_BOX = [[735, 250, 225, 140], [1125, 245, 225, 140]];

export function paintEye(g, E, st) {
  const k = st.look;
  const up = mixPts(E.up0, E.up1, k), lo = mixPts(E.lo0, E.lo1, k);
  const ic = [E.c[0] + st.dx + (E.iris1[0] - E.c[0]) * k, E.c[1] + st.dy + (E.iris1[1] - E.c[1]) * k];
  const ir = 28, pr = 5.5;
  const opening = (c) => { const q = sampleCurve(up, 8); c.moveTo(q[0][0], q[0][1]); for (const p of q) c.lineTo(p[0], p[1]); const l = sampleCurve(lo, 8).reverse(); for (const p of l) c.lineTo(p[0], p[1]); c.closePath(); };
  const inner = E.side < 0 ? up[up.length - 1] : up[0], outer = E.side < 0 ? up[0] : up[up.length - 1];
  g.save(); g.beginPath(); opening(g); g.clip();
  // the eyeball: white, turning grey into both corners (fine curved hatching, not a smooth fill), a few veins
  g.fillStyle = gv(0.975); g.fillRect(E.c[0] - 130, E.c[1] - 80, 260, 160);
  const rv = rng(E.side > 0 ? 601 : 602);
  // the globe turns away into both corners: strokes following the rim, offset inward, fading toward the middle
  for (const [curve, sgn] of [[up, 1], [lo, -1]]) {
    const q = sampleCurve(curve, 6), N = q.length;
    for (const [from, to, seedAdd] of [[0, 0.3, 0], [0.7, 1, 7]]) {
      for (let r2 = 0; r2 < 7; r2++) {
        const off = 3 + r2 * 3.2, i0 = Math.floor(from * (N - 1)), i1 = Math.floor(to * (N - 1));
        const pts = [];
        for (let i = i0; i <= i1; i++) {
          const a = q[Math.max(0, i - 1)], b = q[Math.min(N - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
          pts.push([q[i][0] - dy / d * off * sgn * (E.side < 0 ? 1 : 1), q[i][1] + dx / d * off * sgn]);
        }
        if (pts.length > 2) taper(g, pts, (u) => 1.3 * Math.pow(Math.sin(PI * u), 0.6) * (from === 0 ? 1 - u * 0.7 : 0.3 + u * 0.7), gv(0.3, 0.5 - r2 * 0.055));
      }
    }
  }
  for (const corner of [outer, inner]) {
    const dir = corner[0] < E.c[0] ? 1 : -1;
    for (let i = 0; i < 4; i++) {
      const cx = corner[0] + dir * (12 + rv() * 22), cy = E.c[1] + (rv() - 0.4) * 22, a = (dir > 0 ? 0 : PI) + (rv() - 0.5) * 1.0;
      line(g, [[cx, cy], [cx + Math.cos(a) * 7, cy + Math.sin(a) * 7 + (rv() - 0.5) * 5], [cx + Math.cos(a) * 14, cy + Math.sin(a) * 14]], 0.9, gv(0.3, 0.55));
    }
  }
  // iris: pale, a darker outer band, radial striations from the rim and round the pupil, dark limbal ring, pupil
  g.beginPath(); g.arc(ic[0], ic[1], ir, 0, 2 * PI);
  g.fillStyle = gv(0.84 - 0.3 * k); g.fill();
  g.beginPath(); g.arc(ic[0], ic[1], ir - 1, 0, 2 * PI); g.lineWidth = 6; g.strokeStyle = gv(0.55 - 0.2 * k, 0.8); g.stroke();
  const rs = rng(E.side > 0 ? 611 : 612);
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * 2 * PI + rs() * 0.06, r1 = ir - 2, r0 = ir * (0.55 + rs() * 0.25);
    taper(g, [[ic[0] + Math.cos(a) * r1, ic[1] + Math.sin(a) * r1], [ic[0] + Math.cos(a) * r0, ic[1] + Math.sin(a) * r0]], (u) => 2.2 * (1 - u) + 0.3, gv(0.18, 0.75));
  }
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * 2 * PI + rs() * 0.1, r0 = pr + 1, r1 = pr + 4 + rs() * 5;
    line(g, [[ic[0] + Math.cos(a) * r0, ic[1] + Math.sin(a) * r0], [ic[0] + Math.cos(a) * r1, ic[1] + Math.sin(a) * r1]], 1.1, gv(0.25, 0.6));
  }
  g.beginPath(); g.arc(ic[0], ic[1], ir, 0, 2 * PI); g.lineWidth = 2.6; g.strokeStyle = INKC; g.stroke();
  g.beginPath(); g.arc(ic[0], ic[1], pr, 0, 2 * PI); g.fillStyle = INKC; g.fill();
  // the upper lid's shadow on the eyeball: hatched strokes hanging from the lid (heavier in the look)
  const ql = sampleCurve(up, 6);
  for (let i = 1; i < ql.length - 1; i += 1) {
    const p = ql[i], L = 6 + 8 * k + 3 * Math.sin(PI * i / (ql.length - 1));
    line(g, [[p[0], p[1] - 1], [p[0] + (i % 2 ? 0.8 : -0.8), p[1] + L]], 1.4, gv(0.2, 0.35 + 0.35 * k), { end: 0.2 });
  }
  g.restore();
  // inner corner (caruncle): a small pointed fold
  const dirIn = E.side < 0 ? 1 : -1;
  g.beginPath(); g.moveTo(inner[0] - dirIn * 18, inner[1] + 2); g.quadraticCurveTo(inner[0] - dirIn * 8, inner[1] - 8, inner[0], inner[1] + 1); g.quadraticCurveTo(inner[0] - dirIn * 8, inner[1] + 7, inner[0] - dirIn * 18, inner[1] + 2);
  g.fillStyle = gv(0.55, 0.9); g.fill(); g.lineWidth = 1.2; g.strokeStyle = gv(0.1, 0.8); g.stroke();
  // the upper lid: a heavy line (~4.5 px), the lid crease above it, the thin double lower lid, a few lashes
  line(g, up, 4.8 + 1.2 * k, INKC, { end: 0.3, pow: 0.4 });
  line(g, up.map((p, i) => [p[0] + (i - 3.5) * 1.5, p[1] - 15 - 5 * Math.sin(PI * i / (up.length - 1)) + 4 * k]), 2.0, gv(0.08, 0.85), { end: 0.1 });
  line(g, lo, 1.7, gv(0.06, 0.95), { end: 0.3, pow: 0.5 });
  const lo2 = lo.map((p, i) => [p[0], p[1] + 8 + 4 * Math.sin(PI * i / (lo.length - 1))]);
  const q = sampleCurve(lo, 6), rl = rng(E.side > 0 ? 621 : 622);
  for (let i = 3; i < q.length - 3; i += 2) {
    const p = q[i];
    line(g, [[p[0], p[1] + 2], [p[0] + (rl() - 0.5) * 3, p[1] + 5 + rl() * 4]], 1.8, gv(0.08, 0.8));
  }
  line(g, lo2, 2.6, gv(0.06, 0.9), { end: 0.15 });
}
export const EYE_DEFS = EYES;
export { EYES };

// ---------- the whole static drawing ----------
export function paintDesigner(g) {
  g.lineCap = "round"; g.lineJoin = "round";
  paintHoodie(g);
  paintFace(g);
  paintPencil(g);
  paintMouth(g);
  paintHair(g);
  paintBeanie(g);
  paintLaptop(g);
}
