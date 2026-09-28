import { purePageCanvas, PAGE_W, PAGE_H } from "/src/lib/pureimg.js";
const q = new URLSearchParams(location.search), mode = q.get("mode");
function h32(d) { let h = 2166136261 >>> 0; for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); }
export const shot = { draw(ctx) {
  const src = purePageCanvas(PAGE_W, PAGE_H, { ticketText: "", ticketCaret: false });
  const c = document.createElement("canvas"); c.width = 992; c.height = 620;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (mode === "plain") g.drawImage(src, 0, 0, 992, 620);
  else if (mode === "smooth") { g.imageSmoothingQuality = "high"; g.drawImage(src, 0, 0, 992, 620); }
  else if (mode === "blur") { g.filter = "blur(0.5px)"; g.drawImage(src, 0, 0, 992, 620); g.filter = "none"; }
  else if (mode === "src") { const d = src.getContext("2d").getImageData(0, 0, 1600, 1000).data; let s = 0, a = 0; for (let i = 0; i < d.length; i++) s += d[i]; for (let i = 3; i < d.length; i += 4) a += d[i];
    window.__info = "srchash " + h32(d) + " sum " + s + " alphasum " + a + " px(800,500) " + Array.from(d.slice((500 * 1600 + 800) * 4, (500 * 1600 + 800) * 4 + 4)) + " ctxattr " + JSON.stringify(src.getContext("2d").getContextAttributes()); return; }
  const d = g.getImageData(0, 0, 992, 620).data;
  let amin = 255; for (let i = 3; i < d.length; i += 4) amin = Math.min(amin, d[i]);
  window.__info = mode + " hash " + h32(d) + " alphaMin " + amin;
} };
