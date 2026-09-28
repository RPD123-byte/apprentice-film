import { CAM, CAM0 } from "../../src/shots/s02/cam.js";
import { CAMFIX0, CAMFIX } from "../../src/shots/s02/track.js";
import fs from "fs";
const ch = JSON.parse(fs.readFileSync("chain_pc.json"));
const out = {};
for (let f = 261; f <= 477; f++) {
  const i = Math.min(CAM.length / 2 - 1, f - CAM0); let c = [CAM[2 * i], CAM[2 * i + 1]];
  const k = f - CAMFIX0; if (k >= 0 && k < CAMFIX.length / 2) c = [c[0] + CAMFIX[2 * k], c[1] + CAMFIX[2 * k + 1]];
  out[f] = c;
  if (f % 4 == 0) console.log(f, c.map(v=>v.toFixed(1)).join(","), "  chain", ch[f].slice(0,2).join(","));
}
fs.writeFileSync("oldcam.json", JSON.stringify(out));
