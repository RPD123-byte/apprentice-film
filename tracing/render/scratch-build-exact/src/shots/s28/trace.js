// Renderer for s28's measured vector drawings (see fidelity/s28.md): each drawing is a list of filled regions
// (flat colour or a linear colour ramp) and ink shapes (filled polygons with holes). All geometry comes from
// measurements of the source frames made with snapshots/s28-tools; nothing here is an image.
function ringsPath(g, rings) {
  g.beginPath();
  for (const r of rings) {
    g.moveTo(r[0][0], r[0][1]);
    for (let i = 1; i < r.length; i++) g.lineTo(r[i][0], r[i][1]);
    g.closePath();
  }
}
export function drawRegions(g, regions, { grow = 0.8 } = {}) {
  for (const R of regions) {
    let fill = R.c;
    if (R.g) {
      const gr = g.createLinearGradient(R.g[0], R.g[1], R.g[2], R.g[3]);
      gr.addColorStop(0, R.c); gr.addColorStop(1, R.c1);
      fill = gr;
    }
    ringsPath(g, R.r);
    g.fillStyle = fill; g.fill("evenodd");
    if (grow > 0) { g.lineWidth = grow * 2; g.strokeStyle = fill; g.lineJoin = "round"; g.stroke(); }
  }
}
export function drawInk(g, ink, { alpha = 1, darken = 0 } = {}) {
  g.save(); g.globalAlpha *= alpha;
  for (const layer of [0, 1]) for (const sh of ink) {
    if (sh.l !== layer) continue;
    ringsPath(g, sh.r);
    g.fillStyle = sh.c; g.fill("evenodd");
  }
  g.restore();
}
export function drawTrace(g, T, opts = {}) {
  if (T.base) { g.fillStyle = T.base; g.fillRect(-50, -50, 2306, 1046); }
  if (T.regions) drawRegions(g, T.regions, opts);
  if (T.ink) drawInk(g, T.ink, opts);
}
