import { SETS } from "/Users/computer/rootline/apprentice-film/src/shots/s15/sets.js";
import { viewOf } from "/Users/computer/rootline/apprentice-film/src/shots/s15/author.js";
const [key, pt] = [process.argv[2], process.argv[3].split(",").map(Number)];
const set = SETS.find((s) => s.key === key);
for (const t of process.argv[4].split(",").map(Number)) { const v = viewOf(set.cam(t)); const p = v.project(pt); console.log(t.toFixed(2), p.map((x) => x.toFixed(1)).join(" "), "eye", v.eye.map((x) => x.toFixed(3)).join(",")); }
