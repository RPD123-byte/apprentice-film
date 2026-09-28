import { unpack } from "../../archive/prev-builds/s26-end1-prev/s26/rig.js";
import { FEAT_F, FEAT_F_KEYS } from "../../archive/prev-builds/s26-end1-prev/s26/featF.js";
const out = [];
for (let e = 2882; e <= 2893; e++) { const B = unpack(FEAT_F_KEYS, FEAT_F[e], {}).body; out.push([e, +B.x.toFixed(1), +B.y.toFixed(1), +B.rx.toFixed(1), +B.ry.toFixed(1)]); }
console.log(JSON.stringify(out));
