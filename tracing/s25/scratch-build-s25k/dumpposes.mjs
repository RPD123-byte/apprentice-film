import { POSES } from "/Users/computer/rootline/apprentice-film/src/shots/s25/poses.js";
import fs from "fs";
const o = {};
for (const [k, p] of Object.entries(POSES)) o[k] = { t: p.t, head: p.head, base: p.base, sil: p.sil, tone: p.tone, ink: p.ink, nink: p.ink.length, ntone: p.tone.length };
fs.writeFileSync("poses.json", JSON.stringify(o));
for (const [k, p] of Object.entries(o)) console.log(k, p.t, p.head, p.nink, p.ntone, p.tone.map(b=>b.v).join(","));
