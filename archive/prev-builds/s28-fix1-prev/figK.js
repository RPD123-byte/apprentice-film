// s28 orbit: the designer's key drawings at 129.32 (A) and 129.96 (B), each in its own frame's px.
// Measured outlines (keysData.js) give the shapes; the fills, shading, hatching, fold lines, headphones, the owl's peek
// and the faces are drawn here.
import { canvas, shape, ink, line, hatch, lin, rad, trace, sample } from "./kit.js";
import { KEYS } from "./keysData.js";
import { lidQuad } from "./lid.js";
import { rng } from "../../../lib/rng.js";

const INK = "#241512";
const HOOD = "#a2a690", HOOD_SH = "rgba(40,46,36,0.5)", BEANIE = "#a9ac96", SKIN = "#e9c2a8", HAIR = "#0e0a0a";

function ringsPath(g, R) {
  g.beginPath();
  for (const r of R) { g.moveTo(r[0][0], r[0][1]); for (let i = 1; i < r.length; i++) g.lineTo(r[i][0], r[i][1]); g.closePath(); }
}
const area = (r) => { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a / 2); };
const asRings = (v) => (v && v.length && typeof v[0][0] === "number" ? [v] : v);
const outer = (R) => [R.reduce((b, r) => (area(r) > area(b) ? r : b), R[0])];
const bbox = (pts) => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, y] of pts) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } return [a, b, c, d]; };

// per-key drawn details (frame px of the key), fold lines snapped to the ink (snap.py) or hand-placed
const DETAIL = {
  A: {
    folds: [[[409, 585], [463, 601], [490, 632], [506, 643]], [[334, 662], [394, 665], [444, 663], [509, 670]],
      [[512, 671], [530, 686], [526, 740], [515, 820], [508, 852]], [[534, 272], [551, 308], [567, 360], [580, 410], [574, 447], [550, 487], [536, 530]],
      [[330, 440], [350, 480], [371, 526]], [[402, 399], [418, 428], [431, 452], [449, 498]], [[295, 565], [355, 625], [374, 641]],
      [[254, 726], [294, 764], [323, 803]], [[427, 716], [451, 783], [469, 840]], [[597, 292], [642, 308], [678, 303], [696, 290]],
      [[555, 304], [594, 349], [608, 390], [620, 410], [615, 431]], [[1180, 640], [1200, 700], [1215, 740]]],
    cuff: [[409, 585], [506, 643], [512, 671], [526, 740], [508, 852], [330, 860], [300, 700], [334, 662]],
    phones: { c: [705, 505], rx: 44, ry: 86, rot: 0.2, band: [[700, 420], [690, 340], [720, 285]] },
    fingers: [[[560, 700], [600, 760], [610, 830]], [[600, 690], [650, 740], [660, 790]], [[660, 680], [700, 720], [712, 760]]],
    owl: [1268, 585],
    beanie: [[838, 232], [850, 195], [900, 168], [980, 148], [1060, 140], [1140, 145], [1200, 168], [1240, 210], [1262, 270], [1270, 340],
      [1268, 420], [1258, 490], [1245, 540], [1235, 545], [1215, 490], [1180, 430], [1140, 385], [1090, 345], [1030, 315], [960, 295], [900, 280], [850, 262]],
  },
  B: {
    folds: [[[490, 450], [515, 490], [540, 530]], [[550, 480], [570, 515], [590, 550]], [[420, 560], [470, 600], [520, 620]],
      [[330, 700], [380, 740], [430, 760]], [[560, 330], [600, 400], [620, 470]], [[700, 280], [720, 350], [730, 420]],
      [[640, 640], [650, 720], [640, 800]], [[480, 700], [500, 760], [505, 830]]],
    cuff: [[560, 640], [660, 650], [690, 700], [680, 850], [480, 855], [470, 700]],
    phones: { c: [820, 475], rx: 30, ry: 70, rot: 0.1, band: [[820, 405], [830, 330], [860, 280]] },
    fingers: [[[608, 790], [650, 770], [700, 752], [742, 742]], [[600, 815], [650, 800], [700, 786], [742, 776]], [[616, 840], [660, 828], [712, 815], [745, 808]]],
    owl: null,
    hand: [[648, 668], [700, 690], [745, 700], [778, 705], [750, 760], [745, 830], [700, 845], [640, 855], [600, 850], [585, 830], [598, 800], [610, 760], [625, 700]],
  },
};

function headphones(g, P) {
  ink(g, P.band, 9, "#1c1a19", { taper: 0.1 });
  g.save(); g.translate(P.c[0], P.c[1]); g.rotate(P.rot);
  g.beginPath(); g.ellipse(6, 0, P.rx, P.ry, 0, 0, 6.3); g.fillStyle = "#2c2a28"; g.fill(); g.lineWidth = 2.2; g.strokeStyle = INK; g.stroke();
  for (let a = -1.45; a < 1.5; a += 0.08) { const c = Math.cos(a), s = Math.sin(a); line(g, [[6 + c * P.rx * 0.6, s * P.ry * 0.82], [6 + c * P.rx * 0.95, s * P.ry * 0.96]], 1.2, "rgba(150,145,135,0.5)"); }
  g.beginPath(); g.ellipse(-4, 0, P.rx * 0.62, P.ry * 0.84, 0, 0, 6.3); g.fillStyle = "#1a1817"; g.fill(); g.stroke();
  g.beginPath(); g.ellipse(-6, -2, P.rx * 0.4, P.ry * 0.62, 0, 0, 6.3); g.fillStyle = "#383532"; g.fill();
  g.beginPath(); g.ellipse(-6, -2, P.rx * 0.22, P.ry * 0.42, 0, 0, 6.3); g.fillStyle = "#1c1a19"; g.fill();
  g.restore();
}
// the owl peeking out between the beanie and the lid (the user's white owl: round white head, dark eye, orange beak)
function owlPeek(g, [x, y]) {
  g.save();
  const head = [[x - 32, y - 40], [x + 20, y - 52], [x + 45, y - 20], [x + 42, y + 45], [x - 10, y + 60], [x - 38, y + 30]];
  shape(g, head, "#f1ece2");
  g.fillStyle = rad(g, x + 10, y + 20, 5, 60, [[0, "rgba(0,0,0,0)"], [1, "rgba(150,135,120,0.35)"]]); g.beginPath(); trace(g, head, true, true); g.fill();
  ink(g, [...head, head[0]], 2, INK, { taper: 0 });
  g.beginPath(); g.arc(x, y - 8, 17, 0, 6.3); g.fillStyle = "#fbf8f2"; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
  g.beginPath(); g.arc(x - 2, y - 7, 11, 0, 6.3); g.fillStyle = "#3a2418"; g.fill();
  g.beginPath(); g.arc(x - 2, y - 7, 6, 0, 6.3); g.fillStyle = "#0d0807"; g.fill();
  g.beginPath(); g.arc(x - 5, y - 11, 3, 0, 6.3); g.fillStyle = "#fff"; g.fill();
  shape(g, [[x - 30, y + 28], [x - 12, y + 22], [x - 18, y + 44]], "#e58a3c");
  ink(g, [[x - 30, y + 28], [x - 12, y + 22], [x - 18, y + 44], [x - 30, y + 28]], 1.5, INK, { taper: 0 });
  g.restore();
}

export function paintKey(id) {
  const K = KEYS[id], D = DETAIL[id];
  const c = canvas(2206, 946), g = c.getContext("2d");
  const sil = K.sil, [x0, y0, x1, y1] = bbox(sil);
  if (D.owl) owlPeek(g, D.owl);
  // hoodie
  shape(g, sil, HOOD, { smooth: false });
  g.save(); g.beginPath(); trace(g, sil, true, false); g.clip();
  g.fillStyle = lin(g, x0, y0, x0 + (x1 - x0) * 0.15, y1, [[0, "rgba(255,252,235,0.08)"], [0.4, "rgba(0,0,0,0)"], [0.75, "rgba(40,46,36,0.3)"], [1, HOOD_SH]]);
  g.fillRect(x0 - 10, y0 - 10, x1 - x0 + 20, y1 - y0 + 20);
  // the rolled cuff (a little darker) and hatching in the shade
  shape(g, D.cuff, "rgba(80,88,70,0.18)");
  hatch(g, null, { angle: 1.2, sp: 7, w: 1, color: "rgba(40,48,35,0.25)", seed: 41 + id.charCodeAt(0), len: 30, density: 0.55, bounds: [x0, y0 + (y1 - y0) * 0.3, x0 + (x1 - x0) * 0.5, y1] });
  g.filter = "blur(6px)";
  for (const f of D.folds) ink(g, f.map(([x, y]) => [x + 9, y]), 14, "rgba(70,78,62,0.3)", { taper: 0.9 });
  g.filter = "none";
  for (const f of D.folds) ink(g, f, 1.8, "rgba(36,21,18,0.82)", { taper: 0.8 });
  g.restore();
  // hair / T-shirt (one dark mass), headphones
  if (K.dark && K.dark.length) {
    const R = outer(asRings(K.dark));
    ringsPath(g, R); g.fillStyle = HAIR; g.fill();
    const r = rng(61 + id.charCodeAt(0));
    g.save(); ringsPath(g, R); g.clip();
    const [dx0, dy0, dx1, dy1] = bbox(R[0]);
    for (let i = 0; i < 90; i++) {
      const x = dx0 + r() * (dx1 - dx0), y = dy0 + r() * (dy1 - dy0), a = 1.75 + (r() - 0.5) * 0.7, L = 25 + r() * 60;
      ink(g, [[x, y], [x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.5], [x + Math.cos(a) * L, y + Math.sin(a) * L]], 0.8 + r() * 1.2,
        `rgba(${100 + r() * 30},${88 + r() * 25},${88 + r() * 25},${0.3 + r() * 0.3})`, { taper: 0.9 });
    }
    g.restore();
  }
  // skin: the face keeps the gaps its strands leave; the arm is its outer outline
  for (const n of ["skinF", "skinA"]) {
    let R = n === "skinA" && D.hand ? [D.hand] : asRings(K[n]);
    if (!R || !R.length) continue;
    if (n === "skinA") R = outer(R);
    ringsPath(g, R); g.fillStyle = SKIN; g.fill("nonzero");
    g.save(); ringsPath(g, R); g.clip("nonzero");
    const [sx0, sy0, sx1, sy1] = bbox(outer(R)[0]);
    g.fillStyle = lin(g, sx0, sy0, sx0, sy1, [[0, "rgba(255,244,228,0.2)"], [0.6, "rgba(0,0,0,0)"], [1, "rgba(200,110,95,0.4)"]]);
    g.fillRect(sx0, sy0, sx1 - sx0, sy1 - sy0);
    if (n === "skinF") {
      const cx = (sx0 + sx1) / 2, cy = (sy0 + sy1) / 2, w = sx1 - sx0;
      g.fillStyle = rad(g, cx - w * 0.12, cy + w * 0.12, 4, w * 0.22, [[0, "rgba(230,120,115,0.35)"], [1, "rgba(230,120,115,0)"]]); g.fillRect(sx0, sy0, w, sy1 - sy0);
      g.fillStyle = rad(g, cx + w * 0.22, cy + w * 0.05, 4, w * 0.2, [[0, "rgba(230,120,115,0.3)"], [1, "rgba(230,120,115,0)"]]); g.fillRect(sx0, sy0, w, sy1 - sy0);
      hatch(g, null, { angle: 1.0, sp: 5, w: 0.9, color: "rgba(120,50,45,0.35)", seed: 23, len: 18, density: 0.6, bounds: [sx0, sy0 + (sy1 - sy0) * 0.6, sx0 + w * 0.3, sy1] });
    } else {
      hatch(g, null, { angle: 0.1, sp: 4.5, w: 0.9, color: "rgba(120,50,40,0.4)", seed: 13, len: 50, density: 0.6, bounds: [sx0, sy0 + (sy1 - sy0) * 0.7, sx1, sy1] });
    }
    g.restore();
    ringsPath(g, outer(R)); g.lineWidth = 2; g.strokeStyle = "rgba(36,21,18,0.8)"; g.lineJoin = "round"; g.stroke();
  }
  for (const f of D.fingers) ink(g, f, 1.6, "rgba(36,21,18,0.75)", { taper: 0.6 });
  headphones(g, D.phones);
  // beanie over the hair: measured outline, crown shade, ribbing
  const B = D.beanie || K.beanie.filter((p, i) => i % 3 === 0), [bx0, by0, bx1, by1] = bbox(B);
  shape(g, B, BEANIE);
  g.save(); g.beginPath(); trace(g, B, true, true); g.clip();
  g.fillStyle = lin(g, bx0, by0, bx0 + (bx1 - bx0) * 0.5, by1, [[0, "rgba(60,65,55,0.28)"], [1, "rgba(60,65,55,0)"]]); g.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
  hatch(g, null, { angle: 0.35, sp: 5, w: 1, color: "rgba(40,45,35,0.4)", seed: 51, len: 24, density: 0.8, bounds: [bx0, by0, bx0 + (bx1 - bx0) * 0.55, by0 + (by1 - by0) * 0.4] });
  hatch(g, null, { angle: 1.75, sp: 4, w: 1, color: "rgba(40,45,35,0.42)", seed: 52, len: 36, density: 0.85, bounds: [bx0, by0 + (by1 - by0) * 0.35, bx1, by1] });
  g.restore();
  ink(g, B, 2.6, INK, { closed: true });
  // face features (measured lines): closed lids with lashes, nose, mouth
  for (const n of ["eyeL", "eyeR"]) if (K[n]) {
    ink(g, K[n], (u) => 1.5 + 4 * Math.sin(Math.PI * Math.min(1, u * 1.1)), "#1a0e0e");
    const q = sample(K[n], false), r = rng(71 + n.length);
    for (let i = 1; i < q.length - 1; i += 2) {
      const [x, y] = q[i], [x2, y2] = q[i + 1]; const dx = x2 - x, dy = y2 - y, d = Math.hypot(dx, dy) || 1;
      line(g, [[x, y], [x + dy / d * (5 + 3 * r()), y - dx / d * (5 + 3 * r())]], 1, "rgba(23,12,12,0.6)");
    }
  }
  if (K.nose) ink(g, K.nose, 2, "#6a3530", { taper: 0.6 });
  if (K.mouth) ink(g, K.mouth, (u) => (u < 0.1 ? 4 : 2.4), "#4d2322");
  ink(g, sil, 2.8, INK, { smooth: false, closed: true, taper: 0 });
  // nothing where the key's own frame saw only the lid: clear its lid quad (grown 3 px) so other keys show through
  const Q = lidQuad(K.t), cx = (Q[0][0] + Q[2][0]) / 2, cy = (Q[0][1] + Q[2][1]) / 2;
  g.save(); g.globalCompositeOperation = "destination-out"; g.beginPath();
  Q.forEach(([x, y], i) => { const d = Math.hypot(x - cx, y - cy) || 1, X = x + (x - cx) / d * 3, Y = y + (y - cy) / d * 3; if (i) g.lineTo(X, Y); else g.moveTo(X, Y); });
  g.closePath(); g.fill(); g.restore();
  return c;
}
