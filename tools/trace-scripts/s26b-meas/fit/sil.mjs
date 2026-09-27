// node sil.mjs poses.json F > polys.json : the rig silhouette polygons of one frame
import { rigSilhouette, rigGeom } from "../../../src/shots/s26/rig.js";
import fs from "fs";
const poses = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const out = {};
for (const F of process.argv.slice(3)) { const P = poses[F]; const G = rigGeom(P); out[F] = { sil: rigSilhouette(P, { cups: process.env.CUPS !== "0", feet: process.env.FEET !== "0" }), eyes: G.head.eyes.map((e) => e.c), head: [P.head.x, P.head.y, P.head.r] }; }
process.stdout.write(JSON.stringify(out));
