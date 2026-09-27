// s25 v2 — fix pass 2: feather texture on the standing owl's body (the drawings held longest: hips1 103.96–105.44,
// hips2 108.60–110.48). The measured drawings give the body as flat white with sparse straight ticks; the source has a
// fluffy chest (a V of soft strokes under the face), small curved feather flicks over the belly that follow the body,
// and layered feathers drawn as tapered dark strokes along the lower wings. Positions read off 1.3x grid crops of the
// key frames (2615, 2735), drawing px. The overall tone of the body already matches (σ8 within ±3 levels), so the
// strokes are light and thin: texture, not shading.
import { rng } from "../../../lib/rng.js";
import { taper } from "../../../lib/ink.js";
import { gray } from "./draw.js";

export const FEATH = {
  hips1: {
    chest: [1062, 548], chestW: 58,
    belly: [1066, 690, 112, 118], seed: 71,
    wingL: [[[918, 600], [905, 640], [893, 690]], [[930, 628], [916, 672], [903, 722]], [[940, 660], [926, 700], [915, 750]], [[952, 690], [940, 730], [930, 772]], [[905, 572], [893, 610], [884, 650]], [[925, 700], [914, 735], [905, 765]]],
    wingR: [[[1205, 600], [1222, 640], [1238, 685]], [[1198, 630], [1216, 672], [1232, 718]], [[1190, 665], [1206, 700], [1222, 745]], [[1218, 575], [1236, 612], [1252, 650]], [[1182, 695], [1196, 728], [1210, 765]]],
  },
  hips2: {
    chest: [1058, 548], chestW: 58,
    belly: [1062, 690, 110, 120], seed: 83,
    wingL: [[[920, 598], [906, 640], [894, 688]], [[932, 628], [918, 670], [905, 718]], [[944, 660], [930, 700], [918, 745]], [[906, 570], [894, 608], [886, 648]], [[954, 692], [942, 730], [932, 768]]],
    wingR: [[[1200, 610], [1218, 648], [1234, 690]], [[1194, 640], [1212, 678], [1228, 722]], [[1212, 585], [1230, 620], [1248, 660]], [[1225, 650], [1242, 684], [1258, 720]], [[1186, 675], [1200, 708], [1214, 745]]],
  },
};

function curvePts(p) {
  // quadratic through 3 points, sampled
  const [a, b, c] = p, out = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8, u = 1 - t; out.push([u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]]); }
  return out;
}

export function bodyFeathers(g, key) {
  const F = FEATH[key];
  if (!F) return;
  g.save(); g.lineCap = "round";
  // belly flicks: small "u" arcs, rows following the body's curve (tilted outward toward the sides)
  const r = rng(F.seed), [bx, by, rx, ry] = F.belly;
  for (let i = 0; i < 34; i++) {
    const u = r() * 2 - 1, v = r() * 2 - 1;
    if (u * u + v * v > 1) { i--; continue; }
    const x = bx + u * rx, y = by + v * ry, w = 9 + r() * 8, d = 3 + r() * 3, tilt = u * 0.5;
    g.save(); g.translate(x, y); g.rotate(tilt);
    g.strokeStyle = gray(0.55, 0.35 + 0.25 * r()); g.lineWidth = 1 + r() * 0.5;
    g.beginPath(); g.moveTo(-w / 2, 0); g.quadraticCurveTo(0, d * 2, w / 2, 0); g.stroke();
    g.restore();
  }
  // chest V: soft strokes converging below the face
  const [cx, cy] = F.chest, cw = F.chestW;
  for (let k = 0; k < 4; k++) {
    const yy = cy + k * 14, ww = cw * (1 - k * 0.18);
    for (const s of [-1, 1]) taper(g, curvePts([[cx + s * ww, yy - 6], [cx + s * ww * 0.45, yy + 6], [cx + s * 4, yy + 16]]), (t) => 1.6 * Math.sin(Math.PI * t) + 0.2, gray(0.5, 0.55));
  }
  // wing feathers: tapered dark strokes along the lower wings
  for (const p of [...F.wingL, ...F.wingR]) taper(g, curvePts(p), (t) => 2.2 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.7) + 0.2, gray(0.22, 0.75));
  g.restore();
}
