// dump the existing s05 layer masks as polygons (mock canvas path recorder)
import * as F from "../../src/shots/s05/figure.js";
import * as D from "../../src/shots/s05/desk.js";
import * as HA from "../../src/shots/s05/hands.js";
import { sampleCurve } from "../../src/lib/paths.js";
function rec(fns) {
  const polys = []; let cur = null;
  const c = {
    moveTo(x, y) { cur = [[x, y]]; polys.push(cur); }, lineTo(x, y) { cur.push([x, y]); }, closePath() {},
    bezierCurveTo(a, b, c2, d, x, y) { cur.push([x, y]); }, quadraticCurveTo(a, b, x, y) { cur.push([x, y]); },
    ellipse(x, y, rx, ry, rot, a0, a1) { cur = []; for (let i = 0; i < 64; i++) { const t = (i / 64) * Math.PI * 2; cur.push([x + rx * Math.cos(t) * Math.cos(rot) - ry * Math.sin(t) * Math.sin(rot), y + rx * Math.cos(t) * Math.sin(rot) + ry * Math.sin(t) * Math.cos(rot)]); } polys.push(cur); },
    arc(x, y, r) { cur = []; for (let i = 0; i < 64; i++) { const t = (i / 64) * Math.PI * 2; cur.push([x + r * Math.cos(t), y + r * Math.sin(t)]); } polys.push(cur); },
    rect(x, y, w, h) { polys.push([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]); },
  };
  for (const f of fns) f(c);
  return polys;
}
const out = { fig: rec(F.FIG_MASK), arm: rec(F.ARM_MASK), desk: rec(D.DESK_MASK), lh: rec(HA.LHAND_MASK), rh: rec(HA.RHAND_MASK) };
console.log(JSON.stringify(out));
