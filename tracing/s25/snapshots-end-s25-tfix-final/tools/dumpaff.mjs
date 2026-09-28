import fs from "node:fs";
const R = "/Users/computer/rootline/apprentice-film/src/shots/s25/v2/";
const h = await import(R + "headtrack.js"), m = await import(R + "motion.js"), s = await import(R + "sched.js");
fs.writeFileSync("aff.json", JSON.stringify({ HEAD_F0: h.HEAD_F0, HEAD: h.HEAD, CAM_F0: m.CAM_F0, CAM: m.CAM, SCHED_F0: s.SCHED_F0, SCHED: s.SCHED }));
