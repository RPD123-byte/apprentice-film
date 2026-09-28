
// Scratch harness for the sōko page (F1). Not part of the film. ES modules: open it through any static server that
// serves the project root (e.g. the HyperFrames preview), or bundle it (F1 used esbuild + headless Chromium on
// file://, see docs/soko.md "Testing").
//   ?mode=ill            the illustration only (page coords, no UI, no grade)       &only=a,b  &except=a,b  &bg=0
//   ?mode=page&t=50      the full page (sokoPageCanvas) at identity, through the film's grade at film time t
//   ?mode=s17&t=50       the s17 shot (owned by the s17 agent) at film time t, through the grade (reference only)
//   ?mode=framed&t=72    drawFramedPage (header on/off via &header=0) at film time t, through the grade
//                        &strip=dx,dy,rot  draw the header strip displaced (as if lifted)   &exact=1  quadratic mapping
//   ?mode=boxes          every illustration layer's SOKO_BOXES rectangle outlined over the page
//   ?mode=small          sokoIllSmall on a 1600x904 laptop page (drawSoko)
//   &raw=1               skip the grade   &grain=0  grade without grain   &gaze=owl|down   &scale=1|1.5|2
import { createPost } from "./src/lib/post.js";
const q = new URLSearchParams(location.search);
const mode = q.get("mode") || "blank", t = parseFloat(q.get("t") || "50"), raw = q.get("raw") === "1";
const gaze = q.get("gaze") || (mode === "framed" ? "down" : "owl"), scale = parseFloat(q.get("scale") || "1");
const list = (k) => (q.get(k) ? q.get(k).split(",") : null);
await Promise.all(["900 100px Archivo", "400 20px Geist", "300 20px Geist", "500 20px 'Geist Mono'"].map((f) => document.fonts.load(f)));
await document.fonts.ready;
const out = document.getElementById("out");
const paint = document.createElement("canvas"); paint.width = 2206; paint.height = 946;
const ctx = paint.getContext("2d");
ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 2206, 946);
const T0 = performance.now();
if (mode === "ill") {
  const { sokoIllCanvas } = await import("./src/lib/sokoIll.js");
  ctx.drawImage(sokoIllCanvas({ gaze, scale, only: list("only"), except: list("except"), background: q.get("bg") !== "0" }), 0, 0, 2206, 946);
} else if (mode === "page") {
  const S = await import("./src/lib/sites.js");
  ctx.drawImage(S.sokoPageCanvas({ gaze, scale, header: q.get("header") !== "0", illOnly: list("only"), illExcept: list("except"), ...(q.get("soft") ? { soft: parseFloat(q.get("soft")) } : {}) }), 0, 0, 2206, 946);
} else if (mode === "boxes") {
  const S = await import("./src/lib/sites.js");
  ctx.drawImage(S.sokoPageCanvas({ gaze }), 0, 0);
  ctx.font = "500 12px 'Geist Mono'"; ctx.lineWidth = 1;
  S.SOKO_LAYERS.forEach((name, i) => {
    const [x0, y0, x1, y1] = S.SOKO_BOXES[name];
    ctx.strokeStyle = `hsl(${(i * 47) % 360} 90% 60%)`; ctx.fillStyle = ctx.strokeStyle;
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0 - 1, y1 - y0 - 1); ctx.fillText(name, x0 + 3, y0 + 12);
  });
} else if (mode === "s17") {
  const { shot } = await import("./src/shots/s17.js");
  shot.draw(ctx, t - 47.84, t);
} else if (mode === "framed") {
  const S = await import("./src/lib/sites.js");
  const tA = performance.now();
  const pc = S.sokoPageCanvas({ header: q.get("header") !== "0", gaze });
  const tB = performance.now();
  if (q.get("prof")) { S.drawFramedPage(ctx, pc, {}); const tC = performance.now(); S.drawFramedPage(ctx, pc, {}); console.log("page", (tB - tA).toFixed(0), "framed#1", (tC - tB).toFixed(0), "framed#2", (performance.now() - tC).toFixed(0)); }
  const strip = q.get("strip");
  S.drawFramedPage(ctx, pc, { exact: q.get("exact") === "1", over: strip ? (g) => { const [dx, dy, r] = strip.split(",").map(Number); g.save(); S.framedTransform(g); g.translate(S.HEADER.x + S.HEADER.w / 2 + dx, S.HEADER.y + S.HEADER.h / 2 + dy); g.rotate(r); const c = S.sokoHeaderCanvas({ gaze }); g.drawImage(c, -S.HEADER.w / 2, -S.HEADER.h / 2, S.HEADER.w, S.HEADER.h); g.restore(); } : null });
} else if (mode === "small") {
  const S = await import("./src/lib/sites.js");
  const { sokoIllSmall } = await import("./src/lib/sokoIll.js");
  const c = S.pageCanvas("soko-laptop-test", 1600, 904, (g, w, h) => S.drawSoko(g, w, h, { ill: sokoIllSmall }));
  ctx.drawImage(c, 0, 0);
}
window.__timing = (performance.now() - T0).toFixed(0) + "ms";
if (raw || mode === "blank" || mode === "ill" || mode === "small" || mode === "boxes") {
  out.getContext("2d").drawImage(paint, 0, 0);
} else {
  const grade = createPost(out);
  grade(paint, t, q.get("grain") === "0" ? { fade: 1, grain: 0 } : { fade: 1 });
}
window.__done = true;
