// The desk top in the final s28 view: surface, papers, the book and the cable on the left.
// Frame coordinates of the locked camera (measured on 132.4 s).
import { INKC, poly, fill, stroke, shape, rect, ink, hatch, hatchIn, lin, grain } from "./draw.js";

export const DESK_FAR = [[-20, 800], [1575, 798], [1872, 798], [2230, 932]];   // far edge (room behind above it)

export function paintDesk(g) {
  // surface: warm tan on the left, pale grey-cream toward the sunlit right
  g.save();
  g.beginPath(); poly(g, [[-20, 800], [1575, 798], [1872, 798], [2230, 932], [2230, 960], [-20, 960]]); g.clip();
  g.fillStyle = lin(g, 0, 0, 2206, 0, [[0, "#e2c7a2"], [0.35, "#e6cfae"], [0.55, "#ebe0c8"], [0.75, "#eeebd9"], [1, "#ecebd9"]]);
  g.fillRect(-20, 780, 2260, 200);
  // shadow band right under the far edge
  g.fillStyle = lin(g, 0, 798, 0, 830, [[0, "rgba(120,90,70,0.25)"], [1, "rgba(120,90,70,0)"]]);
  g.fillRect(-20, 798, 2260, 32);
  // papers (white sheets), their inked edges
  fill(g, [[1105, 889], [1300, 885], [1382, 960], [1142, 960]], "#efebd8");
  fill(g, [[1550, 835], [1635, 832], [1880, 960], [1560, 960]], "#eeecdc");
  fill(g, [[1670, 850], [1727, 847], [1958, 960], [1760, 960]], "#f0efe0");
  g.restore();
  stroke(g, [[-20, 800], [1575, 798], [1872, 798], [2230, 932]], INKC, 2.2);
  stroke(g, [[1142, 960], [1105, 889], [1300, 885], [1382, 960]], INKC, 1.8);
  stroke(g, [[1550, 835], [1635, 832], [1880, 960]], INKC, 1.8);
  stroke(g, [[1670, 850], [1727, 847], [1958, 960]], INKC, 1.8);
  // the book on the left (tan cover, pale page block)
  shape(g, [[-10, 822], [160, 830], [158, 848], [-10, 842]], "#cea07b", 1.8);
  shape(g, [[-10, 842], [158, 848], [162, 874], [-10, 882]], "#e8e2d4", 1.8);
  for (let i = 1; i < 5; i++) stroke(g, [[20, 846 + i * 6], [156, 850 + i * 5]], INKC, 0.8, { alpha: 0.5 });
  // cable
  ink(g, [[-10, 884], [60, 886], [130, 896], [210, 908], [260, 915]], 6, "#3a3230", { tip: 0.02 });
  ink(g, [[-10, 884], [60, 886], [130, 896], [210, 908], [260, 915]], 2, "#6a605a", { tip: 0.02 });
  // horizontal pencil shading on the desk under the forearm (right of the laptop)
  g.save(); g.beginPath(); poly(g, [[900, 830], [1330, 830], [1330, 878], [900, 878]]); g.clip();
  hatch(g, [900, 836, 1330, 872], { angle: 0.01, spacing: 4.5, lw: 1.1, col: "#5a3a28", seed: 51, len: [0.3, 0.7], alpha: 0.7 });
  g.restore();
  grain(g, -20, 790, 2260, 180, 0.18);
}

// ------------------------------------------------------------------ the laptop, seen from behind its lid
export const LID = { tl: [128, 508], tr: [868, 508], br: [916, 960], bl: [202, 960], r: 22 };
export function paintLaptopHero(g) {
  // base / deck corner visible bottom right of the lid
  shape(g, [[900, 856], [1010, 858], [1018, 870], [960, 960], [905, 960]], "#5d585a", 2);
  fill(g, [[915, 900], [960, 902], [952, 930], [915, 930]], "#3a3638");
  for (let y = 905; y < 930; y += 5) stroke(g, [[916, y], [955, y + 0.5]], "#1a1618", 1.4);
  stroke(g, [[1010, 860], [1016, 870], [958, 960]], "#8a8488", 1.4);
  // lid: dark grey slab with a slightly lighter rim
  const { tl, tr, br, bl, r } = LID;
  const lidPath = (gg, inset = 0) => {
    gg.beginPath();
    gg.moveTo(tl[0] + r + inset, tl[1] + inset);
    gg.lineTo(tr[0] - r - inset, tr[1] + inset);
    gg.quadraticCurveTo(tr[0] - inset, tr[1] + inset, tr[0] + 3 - inset, tr[1] + r + inset);
    gg.lineTo(br[0] - inset, br[1]);
    gg.lineTo(bl[0] + inset, bl[1]);
    gg.lineTo(tl[0] - 8 + inset, tl[1] + r + 6 + inset);
    gg.quadraticCurveTo(tl[0] - 6 + inset, tl[1] + inset, tl[0] + r + inset, tl[1] + inset);
    gg.closePath();
  };
  lidPath(g); g.fillStyle = "#6a6668"; g.fill();
  lidPath(g, 5); g.fillStyle = lin(g, 0, 510, 0, 946, [[0, "#615c5c"], [0.5, "#5b5656"], [1, "#524d4d"]]); g.fill();
  g.save(); lidPath(g, 5); g.clip();
  // faint mottling / wear
  for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(120,115,115,${0.05})`; g.beginPath(); g.ellipse(300 + i * 110, 700 + (i % 2) * 90, 120, 60, 0.3, 0, 7); g.fill(); }
  g.restore();
  lidPath(g); g.strokeStyle = INKC; g.lineWidth = 3; g.stroke();
  grain(g, 110, 500, 820, 460, 0.35);
}
