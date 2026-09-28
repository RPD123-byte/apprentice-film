// Per-frame refit of the colour owl's body, skull size and feet against the source owl masks (beat F), eyes pinned.
// Pattern search on IoU; writes ../s26c-meas/fitF.json. Scratch (measurement only).
import fs from "fs";
import { colourSilhouette } from "../../src/shots/s26/owlColour.js";
import { poseF } from "./silF.mjs";
import { loadMask, raster, iou } from "./fitlib.mjs";
const frames = process.argv[2] ? process.argv[2].split(",").map(Number) : Array.from({ length: 85 }, (_, i) => 2853 + i);
const buf = new Uint8Array(1103 * 473);
const out = fs.existsSync("../s26c-meas/fitF.json") ? JSON.parse(fs.readFileSync("../s26c-meas/fitF.json")) : {};
for (const F of frames) {
  const m = loadMask(F); if (!m) continue;
  const { P, fx } = poseF(F);
  const H0 = { ...P.head }, yaw = H0.yaw, sp0 = 0.4 + 0.03 * Math.abs(yaw), ro = H0.rot;
  // eye midpoint (fixed): centre + R(ro)(0.12 yaw, 0.1) r
  const ex = 0.4 * yaw * H0.r, ey = 0.1 * H0.r;
  const mid = [H0.x + ex * Math.cos(ro) - ey * Math.sin(ro), H0.y + ex * Math.sin(ro) + ey * Math.cos(ro)];
  const perch = F >= 2926;
  const names = ["bx", "by", "brx", "bry", "brot", "rk"], steps = [8, 8, 8, 8, 0.1, 0.04];
  let v = [P.body.x, P.body.y, P.body.rx, P.body.ry, P.body.rot ?? 0, 1];
  if (!perch) { names.push("f0x", "f0y", "f1x", "f1y", "fs"); steps.push(8, 8, 8, 8, 4); v.push(P.feet[0].x, P.feet[0].y, P.feet[1].x, P.feet[1].y, P.feet[0].size); }
  else { names.push("w0Sx", "w0Sy", "w0Tx", "w0Ty", "w0w", "w1Sx", "w1Sy", "w1Tx", "w1Ty", "w1w"); steps.push(6, 6, 6, 6, 4, 6, 6, 6, 6, 4);
    v.push(...P.wings[0].S, ...P.wings[0].T, P.wings[0].w ?? 16, ...P.wings[1].S, ...P.wings[1].T, P.wings[1].w ?? 16); }
  const apply = (v) => {
    const Q = JSON.parse(JSON.stringify(P)), f2 = { ...fx };
    Q.body = { ...Q.body, x: v[0], y: v[1], rx: Math.max(10, v[2]), ry: Math.max(10, v[3]), rot: v[4] };
    const r = H0.r * v[5]; f2.eyeSp = sp0 / v[5];
    const ex2 = 0.4 * yaw * r, ey2 = 0.1 * r;
    Q.head = { ...H0, r, x: mid[0] - (ex2 * Math.cos(ro) - ey2 * Math.sin(ro)), y: mid[1] - (ex2 * Math.sin(ro) + ey2 * Math.cos(ro)) };
    if (!perch) { Q.feet[0].x = v[6]; Q.feet[0].y = v[7]; Q.feet[1].x = v[8]; Q.feet[1].y = v[9]; Q.feet[0].size = Q.feet[1].size = Math.max(8, v[10]); }
    else { Q.wings[0].S = [v[6], v[7]]; Q.wings[0].T = [v[8], v[9]]; Q.wings[0].w = v[10]; Q.wings[1].S = [v[11], v[12]]; Q.wings[1].T = [v[13], v[14]]; Q.wings[1].w = v[15]; }
    return { Q, f2 };
  };
  const b0 = [P.body.x, P.body.y, P.body.rx, P.body.ry];
  const pen = (v) => 0.4 * Math.max(0, Math.abs(v[5] - 1) - 0.12) + 0.5 * Math.max(0, Math.abs(Math.log(v[2] / b0[2])) - 0.18) + 0.5 * Math.max(0, Math.abs(Math.log(v[3] / b0[3])) - 0.18)
    + 0.002 * Math.max(0, Math.hypot(v[0] - b0[0], v[1] - b0[1]) - 0.35 * b0[2])
    + 0.02 * Math.max(0, (H0.y + 0.25 * H0.r * v[5]) - (v[1] - v[3] * (Math.abs(Math.cos(v[4])) > 0.5 ? 1 : 0.8)));
  const score = (v) => { const { Q, f2 } = apply(v); return iou(raster(colourSilhouette(Q, f2), buf), m) - pen(v); };
  let best = score(v); const s0 = best, st = steps.slice();
  for (let it = 0; it < 6; it++) {
    let imp = true;
    while (imp) {
      imp = false;
      for (let k = 0; k < v.length; k++) for (const sg of [1, -1]) {
        const w = v.slice(); w[k] += sg * st[k]; const sc = score(w);
        if (sc > best + 1e-5) { best = sc; v = w; imp = true; }
      }
    }
    for (let k = 0; k < st.length; k++) st[k] /= 2;
  }
  const { Q, f2 } = apply(v);
  out[F] = { iou0: s0, iou: best, head: Q.head, eyeSp: f2.eyeSp, body: Q.body, feet: Q.feet, wings: perch ? Q.wings : null };
  console.log(`F${F} IoU ${s0.toFixed(3)} -> ${best.toFixed(3)}  rk=${v[5].toFixed(3)} body=(${v[0].toFixed(0)},${v[1].toFixed(0)},${v[2].toFixed(0)}x${v[3].toFixed(0)},${v[4].toFixed(2)})`);
}
fs.writeFileSync("../s26c-meas/fitF.json", JSON.stringify(out));
