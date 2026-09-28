// ---------- clouds ----------
// A cloud layer's top edge is a chain of scallops: cusps [[x, y], ...] and the peak height of each lobe between two
// cusps (tops[i] between cusps i and i+1). Each lobe is two cubic arcs with vertical tangents at the cusps, so the
// edge has the printed look: round puffs meeting in sharp notches. A soft layer ("s": polyline) is used for the
// airbrushed floors (blurred). Layers are clipped to the outer silhouette. Traced on the source at 117.0 s (page)
// and 92.0 s (the parts beyond the page edges that only the header banner shows).
function scallops(ctx, cusps, tops, base) {
  ctx.moveTo(cusps[0][0], base);
  ctx.lineTo(cusps[0][0], cusps[0][1]);
  for (let i = 0; i < tops.length; i++) {
    const [x0, y0] = cusps[i], [x1, y1] = cusps[i + 1], t = tops[i], xm = (x0 + x1) / 2;
    ctx.bezierCurveTo(x0, t + (y0 - t) * 0.2, xm - (xm - x0) * 0.56, t, xm, t);
    ctx.bezierCurveTo(xm + (x1 - xm) * 0.56, t, x1, t + (y1 - t) * 0.2, x1, y1);
  }
  ctx.lineTo(cusps[cusps.length - 1][0], base);
  ctx.closePath();
}
function softEdge(ctx, pts, base) {
  ctx.moveTo(pts[0][0], base);
  ctx.lineTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const L = pts[pts.length - 1];
  ctx.lineTo(L[0], L[1]); ctx.lineTo(L[0], base); ctx.closePath();
}
function layerPath(ctx, L, base) {
  ctx.beginPath();
  if (L.s) softEdge(ctx, L.s, base); else scallops(ctx, L.c, L.t, base);
}
// keyline only along the top edge (the bottom and sides are hidden or cut by the frame)
function strokeTop(ctx, L, lw) {
  ctx.beginPath();
  const { c, t } = L;
  ctx.moveTo(c[0][0], c[0][1]);
  for (let i = 0; i < t.length; i++) {
    const [x0, y0] = c[i], [x1, y1] = c[i + 1], tt = t[i], xm = (x0 + x1) / 2;
    ctx.bezierCurveTo(x0, tt + (y0 - tt) * 0.2, xm - (xm - x0) * 0.56, tt, xm, tt);
    ctx.bezierCurveTo(xm + (x1 - xm) * 0.56, tt, x1, tt + (y1 - tt) * 0.2, x1, y1);
  }
  ctx.lineWidth = lw; ctx.strokeStyle = HC.line; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();
}
function cloud(ctx, C) {
  const { base, layers } = C;
  const outer = layers[0];
  ctx.save();
  layerPath(ctx, outer, base);
  let fill = outer.fill;
  if (outer.grad) { const g = ctx.createLinearGradient(0, outer.grad[0], 0, outer.grad[1]); g.addColorStop(0, outer.fill); g.addColorStop(1, outer.fill2); fill = g; }
  ctx.fillStyle = fill; ctx.fill();
  ctx.clip();
  for (let i = 1; i < layers.length; i++) {
    const L = layers[i];
    ctx.save();
    if (L.blur) ctx.filter = `blur(${L.blur}px)`;
    layerPath(ctx, L, base + 40);
    ctx.fillStyle = L.fill; ctx.fill();
    ctx.restore();
    if (L.lw) strokeTop(ctx, L, L.lw);
  }
  ctx.restore();
  if (outer.lw) strokeTop(ctx, outer, outer.lw);
}
const CL_PINK = "#e680b8", CL_PINK2 = "#d4549a", CL_CREAM = "#f8e1c0", CL_GOLD = "#f0b868", CL_CORAL = "#dc6a7e", CL_MAG = "#e2508e", CL_PEACH = "#f39a6c";
const CLOUDS = [
  // the long bank at top left: from beyond the page's left edge (header banner only) to behind the plant and the sign
  { base: 520, layers: [
    { c: [[-490, 150], [-334, 222], [-288, 232], [-170, 228], [-124, 220], [-76, 176], [18, 135], [148, 162], [218, 212], [266, 248], [330, 282], [470, 380]],
      t: [134, 218, 205, 214, 172, 116, 95, 176, 222, 254, 281], fill: CL_PINK, fill2: CL_PINK2, grad: [110, 330], lw: 2.4 },
    { c: [[-490, 226], [-346, 292], [-290, 304], [-152, 334], [-92, 242], [-38, 224], [14, 189], [134, 204], [206, 230], [262, 264], [330, 305]],
      t: [220, 279, 272, 236, 212, 184, 145, 199, 235, 262], fill: CL_CREAM, lw: 2 },
    { s: [[-490, 257], [-424, 257], [-400, 259], [-384, 271], [-368, 283], [-352, 296], [-340, 305], [-312, 307], [-296, 322], [-288, 327], [-270, 318], [-248, 308], [-224, 308], [-200, 317], [-184, 329], [-168, 351], [-144, 346], [-122, 349], [-115, 300], [-110, 264], [-96, 259], [-80, 256], [-64, 242], [-48, 239], [-32, 235], [-24, 218], [-8, 210], [0, 209], [20, 212], [30, 209], [40, 195], [60, 183], [75, 182], [90, 186], [100, 193], [110, 206], [118, 228], [150, 230], [200, 238], [260, 262], [330, 300], [470, 330]], fill: CL_GOLD, blur: 6 },
    { s: [[-490, 300], [-400, 302], [-352, 322], [-300, 345], [-232, 352], [-200, 360], [-160, 366], [-120, 354], [-112, 272], [-64, 266], [-32, 268], [-8, 254], [0, 251], [20, 244], [60, 238], [80, 237], [100, 247], [120, 249], [140, 266], [180, 273], [230, 282], [330, 305], [470, 340]], fill: CL_CORAL, blur: 8 },
    { s: [[-490, 343], [-400, 349], [-384, 362], [-340, 361], [-300, 382], [-200, 392], [-122, 378], [-108, 288], [-60, 280], [0, 273], [20, 262], [50, 256], [60, 248], [80, 254], [100, 268], [130, 272], [160, 276], [185, 282], [250, 292], [330, 300], [470, 320]], fill: CL_MAG, blur: 8 },
  ] },
  // centre-left cream cloud over the gear, airbrushed peach-orange to magenta
  { base: 760, layers: [
    { c: [[424, 530], [548, 490], [612, 526], [672, 570], [742, 604]], t: [447, 478, 540, 566], fill: CL_CREAM },
    { s: [[424, 500], [446, 488], [470, 480], [500, 484], [518, 505], [548, 509], [572, 518], [596, 545], [640, 575], [700, 600], [742, 620]], fill: CL_PEACH, blur: 10 },
    { s: [[424, 540], [470, 548], [520, 556], [560, 562], [600, 572], [650, 590], [700, 612], [742, 630]], fill: CL_MAG, blur: 12 },
  ] },
  // right: pink cloud rising behind the headphones box
  { base: 660, layers: [
    { c: [[1540, 500], [1600, 470], [1645, 450], [1722, 405], [1792, 352], [1906, 332]], t: [462, 442, 396, 345, 296], fill: CL_PINK, fill2: CL_PINK2, grad: [300, 520] },
    { c: [[1736, 440], [1830, 398], [1906, 392]], t: [378, 372], fill: CL_CREAM },
    { s: [[1736, 470], [1800, 440], [1850, 436], [1906, 440]], fill: CL_PEACH, blur: 9 },
  ] },
  // right: cream cloud behind the lamp
  { base: 700, layers: [
    { c: [[1428, 520], [1490, 470], [1560, 472], [1612, 502], [1664, 540]], t: [455, 440, 490, 515], fill: CL_CREAM },
    { s: [[1428, 520], [1470, 500], [1520, 496], [1570, 512], [1620, 540], [1664, 560]], fill: CL_PEACH, blur: 9 },
    { s: [[1428, 570], [1500, 556], [1560, 566], [1620, 590], [1664, 600]], fill: CL_MAG, blur: 11 },
  ] },
  // far right: cream cloud behind the owl's tower, continuing off the page into a pink bank (header banner only)
  { base: 480, layers: [
    { c: [[2094, 240], [2150, 200], [2262, 188], [2300, 212], [2430, 214], [2476, 210], [2700, 160]], t: [172, 140, 184, 193, 205, 118], fill: CL_PINK, fill2: CL_PINK2, grad: [120, 380], lw: 2.4 },
    { c: [[2094, 240], [2150, 200], [2262, 188], [2300, 320], [2432, 290], [2490, 272], [2700, 220]], t: [172, 140, 250, 259, 263, 203], fill: CL_CREAM, lw: 2 },
    { s: [[2094, 200], [2124, 184], [2140, 206], [2160, 208], [2176, 199], [2192, 185], [2206, 179], [2222, 181], [2254, 184], [2290, 240], [2318, 334], [2334, 310], [2366, 295], [2390, 293], [2414, 300], [2438, 313], [2454, 293], [2486, 288], [2502, 274], [2526, 249], [2550, 240], [2574, 237], [2600, 244], [2700, 250]], fill: CL_GOLD, blur: 6 },
    { s: [[2094, 222], [2124, 221], [2160, 228], [2180, 233], [2204, 229], [2246, 222], [2290, 300], [2320, 372], [2400, 330], [2440, 345], [2500, 318], [2560, 280], [2700, 290]], fill: "#e8704e", blur: 8 },
    { s: [[2094, 300], [2200, 290], [2300, 400], [2422, 362], [2486, 344], [2518, 346], [2600, 330], [2700, 335]], fill: CL_MAG, blur: 8 },
  ] },
  { base: 560, layers: [
    { c: [[2136, 380], [2210, 332], [2300, 360]], t: [352, 318], fill: CL_CREAM },
    { s: [[2136, 380], [2166, 369], [2190, 359], [2210, 356], [2300, 370]], fill: CL_PEACH, blur: 7 },
    { s: [[2136, 400], [2166, 390], [2200, 389], [2300, 400]], fill: "#e8704e", blur: 8 },
  ] },
];
