import { createPost } from "../../src/lib/post.js";
import { shot } from "./old/s17old.js";
(async () => {
  await Promise.all(["900 100px Archivo", "400 20px Geist", "300 20px Geist", "500 20px 'Geist Mono'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  const L = window.LAB, W = 2206, H = 946;
  globalThis.__S17 = L.dbg || {};
  globalThis.__S17T = [];
  const paint = document.createElement("canvas"); paint.width = W; paint.height = H;
  const g = paint.getContext("2d");
  const out = document.createElement("canvas"); out.width = W; out.height = H;
  const grade = createPost(out);
  const [x0, y0, x1, y1] = L.crop;
  const sheet = document.getElementById("c");
  const tw = x1 - x0, th = y1 - y0;
  sheet.width = tw; sheet.height = th * L.times.length;
  const sg = sheet.getContext("2d");
  const times = [];
  for (let i = 0; i < L.times.length; i++) {
    const t = L.times[i];
    const a = performance.now();
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    g.save(); try { shot.draw(g, t - 47.84, t); } catch (e) { g.restore(); g.save(); g.setTransform(1,0,0,1,0,0); g.fillStyle = '#f00'; g.font = '30px sans-serif'; g.fillText(String(e && e.stack || e).slice(0, 160), 20, 100); console.error(e); } g.restore();
    if (L.grade !== false) grade(paint, t, { fade: 1, grain: L.grain ?? undefined });
    times.push(Math.round(performance.now() - a));
    // let the WebGL grade canvas present before reading it back (a stale buffer otherwise repeats the first frame)
    await new Promise((r) => setTimeout(r, 30));
    sg.drawImage(L.grade !== false ? out : paint, x0, y0, tw, th, 0, i * th, tw, th);
  }
  document.title = "ms " + times.join(",") + " | " + globalThis.__S17T.join(",");
})();
