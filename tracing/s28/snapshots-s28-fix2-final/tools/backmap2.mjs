import { trackMap, invert } from "../../src/shots/s28/drawn/trackmap.js";
import fs from "fs";
const lines = fs.readFileSync("snapshots/s28-fix2-work/srccont.txt", "utf8").trim().split("\n");
const out = {};
for (const ln of lines) {
  const i1 = ln.indexOf(" "), i2 = ln.indexOf(" ", i1 + 1); const t = ln.slice(0, i1), js = ln.slice(i2 + 1);
  if (+t > 130.5) continue;
  let P = JSON.parse(js);
  // outer boundary only: from the top, down the left side and along the bottom until it turns back up
  const keep = [P[0]]; let minX = 1e9, bottom = false;
  for (let i = 1; i < P.length; i++) {
    const p = P[i];
    if (p[1] > 790) bottom = true;
    if (bottom && p[1] < 780) break;
    keep.push(p);
  }
  const f = trackMap("L", +t);
  out[t] = keep.map(([x, y]) => invert(f, x, y).map(Math.round));
  console.log(t, "frame", JSON.stringify(keep));
  console.log(t, "locked", JSON.stringify(out[t]));
}
fs.writeFileSync("snapshots/s28-fix2-work/backmapped.json", JSON.stringify(out));
