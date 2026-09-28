import { shot } from "./src/shots/s23.js";
export const SPEC = [];
// timing page: draw each probe frame twice (the first call builds caches), time the second, print the numbers
SPEC[0] = (g) => {
  const ks = [2103, 2130, 2180, 2209, 2213, 2250, 2280, 2300, 2320, 2327, 2340, 2360, 2375, 2385, 2395, 2400, 2403, 2408, 2412, 2416, 2420, 2425];
  const c = document.createElement("canvas"); c.width = 2206; c.height = 946; const x = c.getContext("2d");
  const res = [];
  for (const k of ks) {
    const t = (k + 0.5) / 25;
    x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = "#000"; x.fillRect(0, 0, 2206, 946); shot.draw(x, t - 84.04, t);
    const t0 = performance.now(); x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = "#000"; x.fillRect(0, 0, 2206, 946); shot.draw(x, t - 84.04, t); const d1 = performance.now() - t0;
    res.push(`${k}: ${d1.toFixed(0)} ms`);
  }
  g.fillStyle = "#fff"; g.font = "36px monospace";
  res.forEach((r, i) => g.fillText(r, 40 + Math.floor(i / 11) * 700, 60 + (i % 11) * 60));
};
