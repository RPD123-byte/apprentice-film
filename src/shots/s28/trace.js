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
// a few traced colours were written with a negative channel (e.g. "#3008-1"); canvas ignores an invalid fillStyle and
// keeps the previous one, so they are read here channel by channel and clamped
const OKHEX = /^#[0-9a-f]{6}$/i;
function col(h) {
  if (OKHEX.test(h)) return h;
  const out = []; let i = 1;
  while (i < h.length && out.length < 3) {
    const tok = h[i] === "-" ? h.slice(i, i + 2) : h.slice(i, i + 2);
    out.push(Math.max(0, Math.min(255, h[i] === "-" ? -parseInt(tok.slice(1), 16) : parseInt(tok, 16)))); i += 2;
  }
  while (out.length < 3) out.push(0);
  return "#" + out.map((v) => v.toString(16).padStart(2, "0")).join("");
}
export function drawRegions(g, regions, { grow = 0.8 } = {}) {
  for (const R of regions) {
    let fill = col(R.c);
    if (R.g) {
      const gr = g.createLinearGradient(R.g[0], R.g[1], R.g[2], R.g[3]);
      gr.addColorStop(0, col(R.c)); gr.addColorStop(1, col(R.c1));
      fill = gr;
    }
    ringsPath(g, R.r);
    g.fillStyle = fill; g.fill("evenodd");
    if (grow > 0) { g.lineWidth = grow * 2; g.strokeStyle = fill; g.lineJoin = "round"; g.stroke(); }
  }
}
export function drawInk(g, ink, { alpha = 1, darken = 0 } = {}) {
  g.save(); g.globalAlpha *= alpha;
  // layer 2 (fine hatching, added 2026-09-27) goes under the two main ink levels
  for (const layer of [2, 0, 1]) for (const sh of ink) {
    if (sh.l !== layer) continue;
    ringsPath(g, sh.r);
    g.fillStyle = col(sh.c); g.fill("evenodd");
  }
  g.restore();
}
export function drawTrace(g, T, opts = {}) {
  if (T.base) { g.fillStyle = T.base; g.fillRect(-50, -50, 2306, 1046); }
  if (T.regions) drawRegions(g, T.regions, opts);
  if (T.ink) drawInk(g, T.ink, opts);
}
