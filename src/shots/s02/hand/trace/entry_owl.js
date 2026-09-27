import { drawOwl, owlPose, FIT_PLACE } from "./src/lib/owlInk.js";
const W = 2206, H = 946;
const out = document.getElementById("out");
const paint = document.createElement("canvas"); paint.width = W; paint.height = H;
const ctx = paint.getContext("2d");
function frame(t, graded) {
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  const cfg = window.OWLCFG || { ...owlPose("flyFront"), ...FIT_PLACE.flyFront };
  const t0 = performance.now(); const a = drawOwl(ctx, cfg); const ms = performance.now() - t0;
  window.LASTA = a;
  return { url: paint.toDataURL("image/png"), ms };
}
window.LAB = { frame, owlPose, FIT_PLACE }; window.LABready = true;
