import { SETS } from "/Users/computer/rootline/apprentice-film/src/shots/s15/sets.js";
import { viewOf } from "/Users/computer/rootline/apprentice-film/src/shots/s15/author.js";
const set = SETS.find((s) => s.key === process.argv[2]);
const t = +process.argv[3];
const faces = set.faces();
const v = viewOf(set.cam(t));
console.log("eye", v.eye.map((x) => x.toFixed(3)).join(","), "yaw", v.yaw.toFixed(3), "pitch", v.pitch.toFixed(3));
for (const f of faces) if (f.style === 1) console.log(f.su.toFixed(2), f.sv.toFixed(2), f.q.map((p) => v.project(p).map((x) => x.toFixed(0)).join(" ")).join(" | "), "n", f.n.map((x) => x.toFixed(2)).join(","));
