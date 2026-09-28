// IoU of the colour owl's silhouette against the source owl masks, beat F (scratch)
import { colourSilhouette } from "../../src/shots/s26/owlColour.js";
import { unpack } from "../../src/shots/s26/rig.js";
import { POSES_F, POSES_F_KEYS } from "../../src/shots/s26/posesF.js";
import { FEAT_F, FEAT_F_KEYS } from "../../src/shots/s26/featF.js";
import { loadMask, raster, iou, writePGM } from "./fitlib.mjs";
const F_BASE = { head: { x: 0, y: 0, r: 100, rot: 0, yaw: 0 }, body: { x: 0, y: 0, rx: 100, ry: 100, rot: 0 },
  wings: [{ S: [0, 0], Wr: [0, 0], T: [0, 0], trail: 2, sec: 120, layer: "back" }, { S: [0, 0], Wr: [0, 0], T: [0, 0], trail: 1, sec: 120, layer: "back" }],
  feet: [{ x: 0, y: 0, ang: 0, size: 40 }, { x: 0, y: 0, ang: 0, size: 40 }] };
export function poseF(F) {
  const P = unpack(POSES_F_KEYS, POSES_F[F], F_BASE), Q = unpack(FEAT_F_KEYS, FEAT_F[F], {});
  P.head = { ...P.head, ...Q.head }; P.body = { ...P.body, ...Q.body };
  if (F >= 2926) { P.wings.forEach((w) => { w.type = "folded"; }); P.feet.forEach((f) => { f.mode = "perch"; f.ang = 0; }); }
  const fx = { beak: [Q.beak.x, Q.beak.y], plaster: [Q.plaster.x, Q.plaster.y], cupL: [Q.cupL.x, Q.cupL.y], cupR: [Q.cupR.x, Q.cupR.y] };
  return { P, fx };
}
if (process.argv[1].endsWith("silF.mjs")) {
  const fr = process.argv[2] ? process.argv[2].split(",").map(Number) : Object.keys(FEAT_F).map(Number);
  let tot = 0, n = 0;
  for (const F of fr) {
    const m = loadMask(F); if (!m) continue;
    const { P, fx } = poseF(F), s = raster(colourSilhouette(P, fx)), v = iou(s, m);
    tot += v; n++; console.log(`F${F} IoU=${v.toFixed(3)}`);
    if (process.argv[3]) writePGM(`${process.argv[3]}/sil${F}.pgm`, s);
  }
  console.log("mean", (tot / n).toFixed(3));
}
