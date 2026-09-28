// camera of a set at the given times (after the source's held frames are resolved)
import { SETS, resolveT } from "../../src/shots/s15/sets.js";
const key = process.argv[2]; const times = process.argv[3].split(",").map(Number);
const set = SETS.find((s) => s.key === key);
const cams = {};
for (const t0 of times) { const t = resolveT(Math.ceil(t0 * 25 - 1e-6) / 25); const c = set.cam(t); cams[t0.toFixed(2)] = { t, eye: c.eye, yaw: c.yaw, pitch: c.pitch, roll: c.roll }; }
process.stdout.write(JSON.stringify(cams));
