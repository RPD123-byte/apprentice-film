const T = (f, n = 4) => { const a = performance.now(); for (let i = 0; i < n; i++) f(); return (performance.now() - a) / n; };
let out = null;
export const shot = { draw(ctx) {
  if (out) { console.log(out); return; }
  const r = {}, flush = () => ctx.getImageData(0, 0, 1, 1);
  const c = document.createElement("canvas"); c.width = 420; c.height = 260; const g = c.getContext("2d"); g.fillStyle = "#888"; g.fillRect(0, 0, 420, 260); g.fillStyle = "#fff"; g.fillRect(50, 50, 100, 100);
  ctx.drawImage(c, 0, 0); flush();
  r.translate = T(() => { ctx.setTransform(1, 0, 0, 1, 500.3, 300.7); ctx.drawImage(c, 0, 0); ctx.setTransform(1, 0, 0, 1, 0, 0); flush(); });
  r.rotate = T(() => { ctx.setTransform(0.98, 0.1, -0.1, 0.98, 500, 300); ctx.drawImage(c, 0, 0); ctx.setTransform(1, 0, 0, 1, 0, 0); flush(); });
  r.scale = T(() => { ctx.setTransform(1.03, 0, 0, 0.97, 500, 300); ctx.drawImage(c, 0, 0); ctx.setTransform(1, 0, 0, 1, 0, 0); flush(); });
  r.flushOnly = T(() => flush());
  out = JSON.stringify(r, (k, v) => (typeof v === "number" ? Math.round(v * 10) / 10 : v)); console.log(out);
} };
