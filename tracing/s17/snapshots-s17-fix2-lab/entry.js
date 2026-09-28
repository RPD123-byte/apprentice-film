// s17 pass-4 scratch harness (not part of the film)
import { shot } from "./src/shots/s17.js";
import { createPost } from "./src/lib/post.js";
import * as OWL from "./src/shots/s17/owl.js";
import { headGeom } from "./src/lib/owlInk.js";
import { owlS17Layer } from "./src/shots/s17/owlDraw.js";
import * as DZ from "./src/shots/s17/designer.js";
import * as GR from "./src/shots/s17/gear.js";
import * as SI from "./src/lib/sokoIll.js";
const W = 2206, H = 946;
const paint = document.createElement("canvas"); paint.width = W; paint.height = H;
const ctx = paint.getContext("2d");
const out = document.getElementById("out");
const grade = createPost(out);
function render(t, graded = true) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  const t0 = performance.now(); ctx.save(); shot.draw(ctx, t - 47.84, t); ctx.restore(); window.S17ms = performance.now() - t0;
  if (!graded) return paint;
  grade(paint, t, { fade: 1, ...(shot.grade ? shot.grade(t - 47.84, t) : {}) });
  return out;
}
window.S17 = { shot, render, paint, OWL, headGeom, owlS17Layer, DZ, GR, SI };
window.S17ready = (async () => {
  await Promise.all(["900 100px Archivo", "400 20px Geist", "300 20px Geist", "500 20px 'Geist Mono'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready; return true;
})();
