import { SETS } from "/Users/computer/rootline/apprentice-film/src/shots/s15/sets.js";
import { viewOf } from "/Users/computer/rootline/apprentice-film/src/shots/s15/author.js";
const set = SETS.find((s) => s.key === process.argv[2]);
const faces = set.faces();
const kbs = faces.filter((f) => f.style === 1 && f.su > 0.3 && Math.abs(f.n[1]) < 0.5);
for (const t of process.argv[3].split(",").map(Number)) {
  const v = viewOf(set.cam(t));
  for (const f of kbs.slice(0, 6)) console.log(t.toFixed(2), f.q.map((p) => v.project(p).map((x) => x.toFixed(0)).join(" ")).join(" | "), "n", f.n.map((x) => x.toFixed(2)).join(","), "su", f.su.toFixed(2), "sv", f.sv.toFixed(2));
}
