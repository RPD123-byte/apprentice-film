// initF.mjs: initial rig poses for F (colour owl) from the previous builder's measured flight keys (s26/owlc.js)
import { colorOwlAt } from "../../../src/shots/s26/owlc.js";
import fs from "fs";
const out = {};
for (let F = 2853; F <= 2937; F++) {
  const o = colorOwlAt(F / 25); if (!o) continue;
  const s = o.s, X = (u) => [o.x + u[0] * s, o.y + u[1] * s];
  const r = 61 * s;
  const head = { x: o.x - (o.turn ?? 0) * 12 * s, y: o.y + 4 * s, r, rot: o.headRot ?? 0, yaw: (o.turn ?? 0) * 1.2, eyeSp: 0.4, eyeY: 0.12, tuft: 0.35 };
  const B = o.body || { x: 0, y: 64, rx: 50, ry: 38 };
  const body = { x: o.x + B.x * s, y: o.y + B.y * s, rx: B.rx * s, ry: B.ry * s, rot: (B.rot ?? 0) + Math.PI / 2 * 0 };
  const wings = (o.wings || []).map((w, k) => {
    const S = X(w.S), T = w.tip ? X(w.tip) : X(w.T);
    const d = [T[0] - S[0], T[1] - S[1]], L = Math.hypot(...d) || 1;
    let p = k ? [-d[1] / L, d[0] / L] : [d[1] / L, -d[0] / L];
    if (p[1] < 0) p = [-p[0], -p[1]];
    const Wr = [S[0] + d[0] * 0.35 - p[0] * L * 0.06, S[1] + d[1] * 0.35 - p[1] * L * 0.06];
    return { S, Wr, T, trail: Math.atan2(p[1], p[0]), sec: Math.max(40, 0.42 * L), layer: "back" };
  });
  const ft = o.feet || {};
  const feet = [ft.L, ft.R].filter(Boolean).map((q) => ({ x: o.x + q[0] * s, y: o.y + q[1] * s, ang: 0, size: 20 * s }));
  out[F] = { look: "colour", head, eyes: { L: "open", R: "open" }, body, wings, tail: null, feet: feet.length === 2 ? feet : [{ x: body.x - 10, y: body.y + body.ry, ang: 0, size: 20 * s }, { x: body.x + 10, y: body.y + body.ry, ang: 0, size: 20 * s }] };
}
fs.writeFileSync("poses-F.json", JSON.stringify(out));
console.log(Object.keys(out).length, "frames");
