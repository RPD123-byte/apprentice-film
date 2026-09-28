// scratch: time the shared page builders in a fresh page (logs via console.warn so render.mjs prints them)
import { drawFramedPage, sokoPageCanvas, HEADER } from "/src/lib/sites.js";
import { hippieBannerCanvas, hippiePageCanvas } from "/src/lib/hippie.js";
let done = false;
export const shot = {
  draw(ctx) {
    if (done) return; done = true;
    const T = (n, f) => { const t0 = performance.now(); const r = f(); const g = r && r.getContext ? r.getContext("2d").getImageData(0, 0, 1, 1) : null; console.warn(`warn timing ${n} ${(performance.now() - t0).toFixed(0)} ms`); return r; };
    const sp = T("sokoPage", () => sokoPageCanvas({ gaze: "down" }));
    T("hippieBanner", () => hippieBannerCanvas());
    T("hippiePage", () => hippiePageCanvas());
    const c = document.createElement("canvas"); c.width = 2206; c.height = 946;
    T("framedPage", () => { drawFramedPage(c.getContext("2d"), sp, { glow: 1.4 }); return c; });
  },
};
