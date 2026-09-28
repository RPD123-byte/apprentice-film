import { purePageCanvas, drawPureOverlay, pureStateAt, PAGE_W, PAGE_H } from "/src/lib/pureimg.js";
const q = new URLSearchParams(location.search), step = Number(q.get("step") || 9);
export const shot = { draw(ctx) {
  const K = 0.62;
  const st = pureStateAt(29.5);
  const src = purePageCanvas(PAGE_W, PAGE_H, { ticketText: "", ticketCaret: false });
  const base = document.createElement("canvas"); base.width = Math.round(PAGE_W * K); base.height = Math.round(PAGE_H * K);
  const g = base.getContext("2d", { willReadFrequently: q.get("cpu") === "1" });
  g.imageSmoothingQuality = "high";
  if (step >= 1) { g.filter = step >= 2 ? "blur(0.5px)" : "none"; g.drawImage(src, 0, 0, base.width, base.height); g.filter = "none"; }
  if (step >= 3) { g.save(); g.scale(K, K); drawPureOverlay(g, st.overlay); g.restore(); }
  if (step >= 4) { g.globalCompositeOperation = "multiply"; g.fillStyle = "rgb(255,247,245)"; g.fillRect(0, 0, base.width, base.height);
    g.globalCompositeOperation = "screen"; g.fillStyle = "rgb(20,20,20)"; g.fillRect(0, 0, base.width, base.height); }
  if (step >= 5) { const gl = g.createRadialGradient(base.width * 0.42, base.height * 0.5, 0, base.width * 0.42, base.height * 0.5, base.width * 0.5);
    gl.addColorStop(0, "rgb(34,30,30)"); gl.addColorStop(1, "rgb(0,0,0)"); g.fillStyle = gl; g.fillRect(0, 0, base.width, base.height); }
  g.globalCompositeOperation = "source-over";
  if (step >= 6) { const t = document.createElement("canvas"); t.width = base.width; t.height = base.height; t.getContext("2d").drawImage(base, 0, 0);
    g.globalCompositeOperation = "copy"; g.filter = "contrast(1.09)"; g.drawImage(t, 0, 0); g.filter = "none"; g.globalCompositeOperation = "source-over"; }
  if (step >= 7) { g.globalCompositeOperation = "multiply"; g.fillStyle = "rgb(230,230,230)"; g.fillRect(0, 0, base.width, base.height);
    g.globalCompositeOperation = "lighter"; g.fillStyle = "rgb(8,8,8)"; g.fillRect(0, 0, base.width, base.height); g.globalCompositeOperation = "source-over"; }
  if (step >= 8) { const im = g.getImageData(0, 0, base.width, base.height); g.putImageData(im, 0, 0); }
  if (step >= 9) { const im = g.getImageData(0, 0, base.width, base.height), d = im.data;
    for (let i = 0; i < d.length; i += 4) { const r = d[i], gg = d[i + 1], b = d[i + 2];
      d[i] = -0.0856 * b + 0.2028 * gg + 0.9038 * r - 1.08; d[i + 1] = -0.0393 * b + 1.1264 * gg - 0.0445 * r - 8.67; d[i + 2] = 0.8606 * b + 0.1404 * gg - 0.0435 * r + 3.26; }
    g.putImageData(im, 0, 0); }
  ctx.drawImage(base, 0, 0);
} };
