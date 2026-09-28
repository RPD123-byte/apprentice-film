// The sleeping designer in the final s28 view (frame coordinates of the locked camera).
// Region outlines and the dark masses (hair, tee, headphones) are traced from the 132.4 s source frame
// (heroData.js); fills, shading, knit and linework are drawn here.
import { rng } from "../../lib/rng.js";
import { INKC, poly, spath, fill, stroke, shape, ink, hatch, hatchIn, lin, rad, blob, grain } from "./draw.js";
import { HERO } from "./heroData.js";

export const FC = {
  sage: "#abae98", sageD: "#959a84", sageL: "#c3c3ab", skin: "#f1d0b3", skinS: "#e6b39e", blush: "#e0908a",
  black: "#070404", tee: "#0a0707", hp: "#8f8b84", beanie: "#b0b19c", beanieD: "#8e907c",
};

function region(g, pts, col) { g.beginPath(); poly(g, pts, true); g.fillStyle = col; g.fill(); }
function clipTo(g, pts) { g.beginPath(); poly(g, pts, true); g.clip(); }
function outline(g, pts, lw = 2.4, col = INKC) { g.beginPath(); poly(g, pts, true); g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = "round"; g.stroke(); }

export function paintFigure(g, D = HERO, opts = {}) {
  const R = D.regions;
  // ---- the whole silhouette in ink first: gaps between the part fills read as the ink lines between them
  for (const sp of D.silhouette || []) { g.beginPath(); poly(g, sp, true); g.fillStyle = INKC; g.fill(); }
  // ---- jacket (back / shoulder) and its front panel
  region(g, R.jacket, FC.sage);
  g.save(); clipTo(g, R.jacket);
  blob(g, 700, 470, 260, 120, "rgba(120,125,105,0.35)");
  blob(g, 860, 300, 160, 70, "rgba(210,210,190,0.35)");
  g.restore();
  outline(g, R.jacket, 2.6);
  region(g, R.jkfront, FC.sage); outline(g, R.jkfront, 2);
  // ---- forearm (skin) under the head
  region(g, R.forearm, FC.skin);
  g.save(); clipTo(g, R.forearm);
  g.fillStyle = lin(g, 0, 700, 0, 840, [[0, "rgba(230,160,140,0.55)"], [0.35, "rgba(240,200,170,0)"], [0.8, "rgba(230,170,150,0.25)"], [1, "rgba(200,120,110,0.5)"]]);
  g.fillRect(850, 690, 460, 170);
  g.restore();
  outline(g, R.forearm, 2.4);
  // ---- sleeve of the far arm (right)
  region(g, R.sleeveR, FC.sage);
  g.save(); clipTo(g, R.sleeveR);
  blob(g, 1380, 760, 110, 90, "rgba(120,130,105,0.45)");
  blob(g, 1500, 640, 70, 60, "rgba(220,215,190,0.4)");
  g.restore();
  outline(g, R.sleeveR, 2.6);
  // ---- face, neck and hand skin: base, rim shade toward the edges, blush, nose, lip, neck in shadow
  region(g, R.face, "#efcdb2");
  g.save(); clipTo(g, R.face);
  g.filter = "blur(10px)";
  g.beginPath(); poly(g, R.face, true); g.strokeStyle = "rgba(222,150,130,0.75)"; g.lineWidth = 34; g.stroke();
  g.filter = "blur(9px)";
  const soft = (x, y, rx, ry, rot, col) => { g.save(); g.translate(x, y); g.rotate(rot); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 7); g.fillStyle = col; g.fill(); g.restore(); };
  soft(1045, 585, 40, 75, 0.2, "rgba(214,140,122,0.8)");       // neck in shadow
  soft(1268, 452, 34, 16, 0.75, "rgba(214,130,118,0.55)");     // blush under the upper eye
  soft(1335, 585, 44, 20, 0.6, "rgba(226,150,128,0.55)");      // blush on the lower cheek
  soft(1212, 552, 20, 12, 0.6, "rgba(222,150,130,0.5)");       // nose shade
  soft(1160, 612, 20, 8, 0.6, "rgba(206,120,112,0.55)");       // lower lip
  soft(1265, 668, 40, 12, -0.1, "rgba(222,150,135,0.5)");      // hand
  g.filter = "none";
  g.restore();
  // ---- beanie
  region(g, R.beanie, FC.beanie);
  g.save(); clipTo(g, R.beanie);
  blob(g, 1250, 230, 140, 90, "rgba(110,112,95,0.5)");
  blob(g, 1450, 250, 120, 120, "rgba(215,212,190,0.35)");
  hatch(g, [1120, 120, 1620, 560], { angle: 1.25, spacing: 5, lw: 1, col: "#3a3a30", seed: 61, len: [0.15, 0.35], alpha: 0.45 });
  g.restore();
  outline(g, R.beanie, 2.6);
  // ---- headphone cup faces (grey) under the ink
  g.save(); g.translate(1004, 462); g.rotate(-0.42);
  g.beginPath(); g.ellipse(0, 0, 52, 80, 0, 0, 7); g.fillStyle = "#8f8c84"; g.fill();
  g.restore();
  // ---- ink: traced tone layers (mid browns first, then the blacks), even-odd rings for holes
  drawInk(g, D.ink);
  grain(g, 480, 100, 1200, 800, 0.22);
}

export function drawInk(g, ink, alpha = 1) {
  if (!ink) return;
  g.save(); g.globalAlpha *= alpha;
  for (const layer of [0, 1]) for (const sh of ink) {
    if (sh.l !== layer) continue;
    g.beginPath();
    for (const r of sh.r) poly(g, r, true);
    g.fillStyle = sh.c; g.fill("evenodd");
  }
  g.restore();
}

// one traced stroke: polyline with a width per point, tapered ends
export function drawLine(g, L, alpha = 1) {
  const p = L.p, w = L.w, n = p.length;
  if (n < 2) return;
  const Lft = [], Rt = [];
  for (let i = 0; i < n; i++) {
    const a = p[Math.max(0, i - 1)], b = p[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const end = (i === 0 || i === n - 1) ? 0.55 : 1;
    const hw = Math.max(0.45, w[i] * 0.5 * end);
    Lft.push([p[i][0] - dy * hw, p[i][1] + dx * hw]); Rt.push([p[i][0] + dy * hw, p[i][1] - dx * hw]);
  }
  g.beginPath(); g.moveTo(Lft[0][0], Lft[0][1]);
  for (let i = 1; i < n; i++) g.lineTo(Lft[i][0], Lft[i][1]);
  for (let i = n - 1; i >= 0; i--) g.lineTo(Rt[i][0], Rt[i][1]);
  g.closePath();
  g.globalAlpha = alpha; g.fillStyle = L.c; g.fill(); g.globalAlpha = 1;
}
