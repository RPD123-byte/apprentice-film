// s18 shot A (53.24-55.24, source frames 1331-1381): the synth corner, locked off (camtrack s = 1.0000, drift
// < 0.2 px). The plate is an ink drawing of the owl-free plate (data/roomA.js). The owl is one rigid drawing per
// wing phase (level, up, level, down on the source's 24-fps content frames) carried along PATH_A, with the legs and
// feet drawn per frame, a seeded line boil per content frame, and a horizontal motion blur while it flies in.
import { decodeInk, drawInk, softHalf, drawnCanvas, cpuCanvas } from "./inkdraw.js";
import { softCanvas } from "./soft.js";
import { ROOM_A } from "./data/roomA.js";
import { OWL_A } from "./data/owlA.js";
import { boilMap, boilTone, contentFrame, boilVariant } from "./boil.js";
import { applyTone } from "./tone.js";
import { TONE_A } from "./data/toneA.js";
import { TONE_OWL_A } from "./data/toneOwlA.js";

// Head/body template offsets vs frame 1356, per source frame (template match on the source). [frame, dx, dy]
export const PATH_A = [
  [1331, 1224, -58], [1332, 1097, -43], [1333, 985, -39], [1334, 864, -32], [1335, 755, -21], [1336, 647, -7], [1337, 554, -4],
  [1338, 470, 0], [1339, 400, 4], [1340, 331, 4], [1341, 283, 1], [1342, 241, 4], [1343, 205, 2], [1344, 178, 5], [1345, 155, 2],
  [1346, 137, 4], [1347, 118, 0], [1348, 103, 4], [1349, 87, 1], [1350, 72, 2], [1351, 72, 2], [1352, 56, 1], [1353, 42, 4],
  [1354, 28, 1], [1355, 14, 2], [1356, 0, 0], [1357, -12, 4], [1358, -25, 0], [1359, -37, 3], [1360, -48, 1], [1361, -56, 4],
  [1362, -60, 0], [1363, -58, 4], [1364, -52, 3], [1365, -45, 3], [1366, -35, 1], [1367, -20, 4], [1368, -9, 2], [1369, -1, 2],
  [1370, 10, 0], [1371, 22, 3], [1372, 33, 2], [1373, 40, 2], [1374, 49, 0], [1375, 57, 4], [1376, 57, 4], [1377, 63, 3],
  [1378, 65, 0], [1379, 69, 2], [1380, 72, 4], [1381, 71, 1],
];
const wingPhase = (f) => ["level", "up", "level", "down"][contentFrame(f) % 4];
const offset = (f) => { const r = PATH_A[Math.max(0, Math.min(PATH_A.length - 1, f - 1331))]; return [r[1], r[2]]; };

// calibration of the redraw (measured against the plate / the registered owl medians): dark-stroke width gain
const WK_PLATE = 0.92, WK_OWL = 0.85;
// horizontal motion blur (sigma px) of the owl layer while it flies in / lands: matched per frame to the source's
// horizontal / vertical gradient ratio inside the head and body (0.43-0.73 on 1331-1343 against ~0.9 standing)
export const SMEAR = { 1331: 2.2, 1332: 2.4, 1333: 3.2, 1334: 2.8, 1335: 2.45, 1336: 2.05, 1337: 2.45, 1338: 2.15, 1339: 2.05,
  1340: 1.75, 1341: 1.6, 1342: 1.3, 1343: 1.15, 1344: 0.4, 1345: 0.45 };
export const OWL_SOFT = 1;   // softHalf amount for the owl layer
const BOIL = 0.8, TJIT = 0.08;
const HOLD_A = { 1351: 1350, 1376: 1375 };

let plate = null, D = null, layer = null;
function decoded() {
  if (D) return D;
  D = { phase: {}, feet: {} };
  for (const [k, v] of Object.entries(OWL_A.phase)) D.phase[k] = decodeInk(v);
  for (const [k, v] of Object.entries(OWL_A.feet)) D.feet[k] = decodeInk(v);
  return D;
}
export function roomACanvas() {
  if (plate) return plate;
  plate = cpuCanvas(2206, 946);
  const g = plate.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, 2206, 946);
  drawInk(g, decodeInk(ROOM_A), { wk: WK_PLATE });
  softHalf(plate, 1);
  applyTone(plate, TONE_A);   // the measured value-study correction (blurred values matched to the source plate)
  return plate;
}
const LX = 344, LY = 44, LW = 772, LH = 672, X0 = 360, Y0 = 60;
// per-frame head/body affine of the fly-in and landing (template -> frame, about the drawing crop origin X0, Y0),
// canvas order a, b, c, d, e, f; fitted by ECC on the source frames registered on PATH_A (identity afterwards)
export const FLY_W = {1331: [0.9862, -0.0269, 0.0169, 0.9585, -2.16, 15.17], 1332: [0.9737, -0.0478, 0.0700, 0.9761, -11.77, 17.52], 1333: [0.9895, -0.0242, 0.0158, 0.9540, -6.06, 14.67], 1334: [0.9744, -0.0355, 0.0466, 0.9767, -8.31, 13.77], 1335: [0.9873, -0.0419, 0.0409, 0.9772, -8.98, 15.05], 1336: [0.9955, -0.0506, 0.0834, 1.0167, -20.34, 10.65], 1337: [1.0043, -0.0046, 0.0012, 0.9797, -2.83, 6.17], 1338: [0.9942, -0.0099, 0.0155, 0.9925, -5.18, 4.21], 1339: [1.0028, 0.0122, -0.0211, 1.0044, 0.25, -7.41], 1340: [0.9905, 0.0095, -0.0048, 1.0050, 3.59, -3.75], 1342: [0.9990, 0.0061, -0.0108, 1.0027, 3.00, -1.87], 1343: [1.0053, 0.0047, -0.0075, 1.0009, 0.63, -1.01]};
export function drawOwlA(ctx, f) {
  const d = decoded(), [dx, dy] = offset(f), cf = contentFrame(f);
  const opts = { map: boilMap(cf, BOIL), tone: boilTone(cf, TJIT), wk: WK_OWL };
  const W = FLY_W[f], ph = d.phase[wingPhase(f)], fk = HOLD_A[f] || f, ft = d.feet[fk];
  const paint = (g, ox, oy) => {
    // the phase drawing, in one of its pre-drawn boil variants (softened once); on the fly-in / landing it is also
    // turned and scaled a little (ECC fit of the head and body per frame)
    g.save(); g.translate(ox, oy);
    if (W) { g.translate(X0, Y0); g.transform(W[0], W[1], W[2], W[3], W[4], W[5]); g.translate(-X0, -Y0); }
    const v = boilVariant(cf), dc = drawnCanvas(ph, v, { map: boilMap(1000 + v, BOIL), tone: boilTone(1000 + v, TJIT), wk: WK_OWL }, OWL_SOFT);
    if (dc && !dc.toned) { applyTone(dc.c, TONE_OWL_A[wingPhase(f)], { dx: dc.x, dy: dc.y }); dc.toned = true; }
    if (dc) g.drawImage(dc.c, dc.x, dc.y);
    g.restore();
    // the legs and feet were measured in the frame itself (registered by PATH_A only)
    if (ft) { g.save(); g.translate(ox, oy); drawInk(g, ft, { ...opts, cache: false, low: "grad" }); g.restore(); }
  };
  if (!(SMEAR[f] > 0.05)) { paint(ctx, dx, dy); return; }
  // flying in: the owl is motion-blurred horizontally, so it goes through its own layer
  if (!layer) layer = cpuCanvas(LW, LH);
  const g = layer.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, LW, LH);
  paint(g, -LX, -LY);
  softCanvas(layer, SMEAR[f], 0);
  ctx.drawImage(layer, LX + dx, LY + dy);
}
export function drawA(ctx, f) { ctx.drawImage(roomACanvas(), 0, 0); drawOwlA(ctx, f); }
export function releaseA() { plate = null; D = null; layer = null; }
