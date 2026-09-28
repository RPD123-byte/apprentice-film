const T = (f) => { const a = performance.now(); f(); return performance.now() - a; };
let out = null;
export const shot = { draw(ctx) {
  if (out) { console.log(out); return; }
  const r = {}, flush = () => ctx.getImageData(0, 0, 1, 1);
  const L = document.createElement("canvas"); L.width = 2206; L.height = 946; const g = L.getContext("2d");
  const path = () => { g.beginPath(); g.ellipse(1100, 470, 700, 350, 0, 0, 7); };
  r.solid = T(() => { for (let i = 0; i < 3; i++) { path(); g.fillStyle = "#888"; g.fill(); } ctx.drawImage(L, 0, 0); flush(); }) / 3;
  const gr = g.createLinearGradient(400, 0, 1800, 0); gr.addColorStop(0, "#222"); gr.addColorStop(1, "#eee");
  r.grad = T(() => { for (let i = 0; i < 3; i++) { path(); g.fillStyle = gr; g.fill(); } ctx.drawImage(L, 0, 0); flush(); }) / 3;
  const pc = document.createElement("canvas"); pc.width = 1400; pc.height = 700; const pg = pc.getContext("2d"); const id = pg.createImageData(1400, 700);
  for (let i = 0; i < id.data.length; i += 4) { id.data[i] = id.data[i + 1] = id.data[i + 2] = (i / 4) % 256; id.data[i + 3] = 255; }
  pg.putImageData(id, 0, 0);
  const pat = g.createPattern(pc, "no-repeat"); pat.setTransform(new DOMMatrix([1, 0, 0, 1, 400, 120]));
  r.pattern1 = T(() => { path(); g.fillStyle = pat; g.fill(); ctx.drawImage(L, 0, 0); flush(); });
  r.pattern = T(() => { for (let i = 0; i < 3; i++) { path(); g.fillStyle = pat; g.fill(); } ctx.drawImage(L, 0, 0); flush(); }) / 3;
  // pattern from a canvas drawn with drawImage (GPU-resident?)
  const pc2 = document.createElement("canvas"); pc2.width = 1400; pc2.height = 700; pc2.getContext("2d").drawImage(pc, 0, 0);
  const pat2 = g.createPattern(pc2, "no-repeat"); pat2.setTransform(new DOMMatrix([1, 0, 0, 1, 400, 120]));
  r.pattern2 = T(() => { for (let i = 0; i < 3; i++) { path(); g.fillStyle = pat2; g.fill(); } ctx.drawImage(L, 0, 0); flush(); }) / 3;
  // clip + drawImage instead of pattern
  r.clipdraw = T(() => { for (let i = 0; i < 3; i++) { g.save(); path(); g.clip(); g.drawImage(pc, 400, 120); g.restore(); } ctx.drawImage(L, 0, 0); flush(); }) / 3;
  r.put = T(() => { pg.putImageData(id, 0, 0); flush(); });
  r.blit = T(() => { for (let i = 0; i < 3; i++) ctx.drawImage(L, 0, 0); flush(); }) / 3;
  out = JSON.stringify(r, (k, v) => (typeof v === "number" ? Math.round(v * 10) / 10 : v)); console.log(out);
} };
