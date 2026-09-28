import { TRACED } from "/Users/computer/rootline/apprentice-film/src/shots/s22/owlData.js";
const LATE = [[79.8, "f7980"], [79.84, "f7984"], [79.88, "f7988"], [79.92, "f7992"], [79.96, "f7996"], [80.0, "f8000"], [80.04, "f8004"],
  [80.08, "brand"], [80.56, "f8056"], [80.6, "f8060"], [80.64, "f8064"], [80.68, "f8068"], [80.72, "f8072"], [80.76, "f8076"],
  [80.8, "f8080"], [80.88, "f8088"], [80.96, "f8096"], [81.04, "f8104"], [81.12, "f8112"], [81.2, "f8120"], [81.28, "f8128"], [81.44, "f8144"],
  [81.52, "f8152"], [81.6, "f8160"], [81.72, "walk"], [83.96, "f8396"]];
const BRAND_DY = [[80.08, -0.3], [80.12, -1.94], [80.16, -5.01], [80.24, -2.98], [80.28, -0.23], [80.32, 0.1], [80.36, 0.05], [80.4, 0]];
const WALK_T = Object.entries(TRACED.walk.meta.warp).map(([t, m]) => [+t, ...m]).sort((p, q) => p[0] - q[0]);
const hold = (K, t) => { let r = K[0]; for (const k of K) if (k[0] <= t + 1e-6) r = k; return r.slice(1); };
function srcT(t) { let F = Math.ceil(t * 25 - 1e-3); if (F >= 1880 && F <= 2005 && F % 25 === 5) F -= 1; return F / 25; }
const out = {};
for (let F = 1995; F <= 2100; F++) {
  const T = srcT(F / 25); const name = hold(LATE, T)[0]; const D = TRACED[name];
  let m = [1, 0, 0, 1, 0, 0];
  if (name === 'walk') m = hold(WALK_T, T);
  else if (name === 'brand') m = [1, 0, 0, 1, 0, T < 80.4 ? hold(BRAND_DY, T)[0] : 0];
  out[F] = { name, m, o: D.o, w: D.w, h: D.h };
}
console.log(JSON.stringify(out));
import { TOP_CUP, RIGHT_CUP, BOT_CUP, LEFT_CUP } from "./cups22.mjs";
const SIDE_R = [[1, 0, 0, 1], [0, 1, -1, 0], [-1, 0, 0, -1], [0, -1, 1, 0]];
const out2 = JSON.parse(JSON.stringify(out));
for (let F = 1863; F <= 1994; F++) {
  const T = srcT(F / 25); let side, cup;
  if (T < 76.54) { side = 0; cup = hold(TOP_CUP, T); } else if (T < 77.46) { side = 1; cup = hold(RIGHT_CUP, T); }
  else if (T < 79.22) { side = 2; cup = hold(BOT_CUP, T); } else { side = 3; cup = hold(LEFT_CUP, T); }
  const d = side === 0 ? [0.48, 0] : [0, 0]; const r = SIDE_R[side];
  out2[F] = { name: 'edge' + side, m: [r[0], r[1], r[2], r[3], cup[0] + d[0], cup[1] + d[1]], o: TRACED.edge.o, w: TRACED.edge.w, h: TRACED.edge.h };
}
import fs from "fs";
fs.writeFileSync(new URL("./boxes.json", import.meta.url), JSON.stringify(out2));
