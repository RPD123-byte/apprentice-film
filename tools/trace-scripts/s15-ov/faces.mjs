// dump world-space faces of a set + its camera at the given times
import { SETS, resolveT } from "../../src/shots/s15/sets.js";
const key = process.argv[2]; const times = process.argv[3].split(",").map(Number);
const set = SETS.find((s) => s.key === key);
const F0 = set.faces(); const faces = F0.map((f) => ({ q: f.q, n: f.n, style: f.style, ink: f.ink, alb: f.alb }));
const cams = {};
for (const t0 of times) { const t = resolveT(Math.ceil(t0 * 25 - 1e-6) / 25); const c = set.cam(t); cams[t0.toFixed(2)] = { t, eye: c.eye, yaw: c.yaw, pitch: c.pitch, roll: c.roll }; }
process.stdout.write(JSON.stringify({ faces, cams }));
