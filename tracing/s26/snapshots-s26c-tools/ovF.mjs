import fs from "fs";
import { colourSilhouette } from "../../src/shots/s26/owlColour.js";
import { poseF } from "./silF.mjs";
import { raster, writePGM } from "./fitlib.mjs";
const fit = JSON.parse(fs.readFileSync("../s26c-meas/fitF.json"));
for (const F of process.argv[2].split(",").map(Number)) {
  let { P, fx } = poseF(F);
  if (fit[F] && process.argv[3] === "fit") { P.head = fit[F].head; P.body = fit[F].body; P.feet = fit[F].feet; if (fit[F].wings) P.wings = fit[F].wings; fx.eyeSp = fit[F].eyeSp; }
  writePGM(`../s26c-meas/sil_${F}.pgm`, raster(colourSilhouette(P, fx)));
}
