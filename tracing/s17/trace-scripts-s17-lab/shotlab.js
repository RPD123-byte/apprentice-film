import { createPost } from "../../src/lib/post.js";
import { shot } from "../../src/shots/s17.js";
(async () => {
  await Promise.all(["900 100px Archivo", "400 20px Geist", "300 20px Geist", "500 20px 'Geist Mono'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  const L = window.LAB, W = 2206, H = 946;
  const [x0, y0, x1, y1] = L.crop || [0, 0, W, H];
  const sc = L.scale, tw = Math.round((x1 - x0) * sc), th = Math.round((y1 - y0) * sc), cols = L.cols;
  const paint = document.createElement("canvas"); paint.width = W; paint.height = H;
  const g = paint.getContext("2d");
  const out = document.createElement("canvas"); out.width = W; out.height = H;
  const grade = createPost(out);
  const sheet = document.getElementById("c");
  sheet.width = tw * cols; sheet.height = th * Math.ceil(L.times.length / cols);
  const sg = sheet.getContext("2d");
  sg.fillStyle = "#000"; sg.fillRect(0, 0, sheet.width, sheet.height);
  const T0 = performance.now(); const times = [];
  L.times.forEach((t, i) => {
    const a = performance.now();
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    g.save(); shot.draw(g, t - 47.84, t); g.restore();
    if (L.grade !== false) grade(paint, t, { fade: 1 });
    times.push(Math.round(performance.now() - a));
    const c = i % cols, r = Math.floor(i / cols);
    sg.drawImage(L.grade !== false ? out : paint, x0, y0, x1 - x0, y1 - y0, c * tw, r * th, tw, th);
  });
  document.title = "ms " + times.join(",");
  const pre = document.createElement("pre"); pre.id = "o"; pre.textContent = JSON.stringify(times); pre.style.display = "none"; document.body.appendChild(pre);
})();
