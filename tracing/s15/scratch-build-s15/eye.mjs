import { SETS } from "/Users/computer/rootline/apprentice-film/src/shots/s15/sets.js";
const set = SETS.find((s) => s.key === process.argv[2]);
for (const t of process.argv[3].split(",").map(Number)) { const c = set.cam(t); console.log(t.toFixed(2), c.eye.map((x) => x.toFixed(3)).join(" "), "yaw", c.yaw.toFixed(3)); }
