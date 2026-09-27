// s22: the owl after the cut (79.80–84.04), drawn in code with s21's owl painter (s22/owl21.js). Each drawing the
// source holds is one spec, posed and fitted to that drawing: silhouette IoU against the source's owl silhouette
// plus measured landmarks (head, cups, eyes, feet, wing tips, scissors), and the face and feather details drawn as
// short measured strokes (s22/art.js). The source is only measured; nothing of it is stored.
//
// Coordinates: a spec is in its drawing's local px (pixel-index coordinates; for a held drawing that is the frame,
// for the walk the drawing's own frame, placed per pose by WALK_T). `flip` mirrors the painter (it only draws a bird
// facing right) about x = head[0]; everything given in px (feet, scissors, art) is in the real, unmirrored frame.
import { owlSprite, over } from "./owl21.js";
import * as P21 from "./poses21.js";
import { drawScissors, scissorsBox } from "./sc21.js";
import { softenCanvas } from "./soft21.js";
import { drawArt } from "./art.js";
import { ringSpec } from "./cut.js";

const BASES = { TOP: P21.TOP, WALK: P21.WALK, FLY: P21.FLY, LOOK: P21.LOOK, CROUCH: P21.CROUCH, FACE: { ...P21.FACE, head: { yaw: 0, nod: 0, roll: 0, r: 95, bump: 6, square: 2.4 }, body: P21.WALK.body, tail: P21.WALK.tail } };

export function lateScissors(spec) {
  if (!spec.sc) return null;
  const sc = { ...spec.sc };
  return { ...sc, rings: sc.rings.map((r) => ringSpec(sc, r)) };
}
function poseOf(spec) {
  const s = spec.s, [hx, hy] = spec.head, k = spec.flip ? -1 : 1;
  let pose = over(BASES[spec.base || "WALK"], spec.pose || {});
  // wings / hips may be given in real local px (px: true): converted to (mirrored) units here
  const U = (p) => [(k * (p[0] - hx)) / s, (p[1] - hy) / s];
  const wing = (w) => (w.px ? { ...w, S: U(w.S), Wr: w.Wr && U(w.Wr), T: w.T && U(w.T), A: w.A && U(w.A), B: w.B && U(w.B), trail: w.trail && [k * w.trail[0], w.trail[1]], len: w.len / s, sag: w.sag != null ? w.sag / s : w.sag } : { ...w });
  pose = { ...pose, grip: null, wings: (spec.wings || []).map(wing) };
  pose.legs = (spec.legs || []).map((L) => ({ toe: 36, w: 15, thigh: 40, ...L, hip: L.hipPx ? U(L.hipPx) : L.hip, foot: U(L.foot) }));
  return pose;
}
export function lateSprite(spec, { res = 2, canvas = null, soft = spec.soft ?? 1.2 } = {}) {
  const [hx, hy] = spec.head, pose = poseOf(spec), sc = lateScissors(spec);
  const real = (fn) => (g) => { g.save(); if (spec.flip) g.transform(-1, 0, 0, 1, 2 * hx, 0); fn(g); g.restore(); };
  let ext = null;
  if (sc) { const e = scissorsBox(sc); ext = spec.flip ? [2 * hx - e[2], e[1], 2 * hx - e[0], e[3]] : e; }
  if (spec.extent) { const e = spec.extent, m = spec.flip ? [2 * hx - e[2], e[1], 2 * hx - e[0], e[3]] : e; ext = ext ? [Math.min(ext[0], m[0]), Math.min(ext[1], m[1]), Math.max(ext[2], m[2]), Math.max(ext[3], m[3])] : m; }
  const scIn = (layer) => (sc && (spec.scLayer || "mid") === layer ? (g) => drawScissors(g, sc) : null);
  const hook = (...fns) => { const f = fns.filter(Boolean); return f.length ? real((g) => f.forEach((fn) => fn(g))) : null; };
  const B = owlSprite(pose, { x: hx, y: hy, s: spec.s, res, canvas, extent: ext,
    mid: hook(scIn("mid"), spec.mid ? (g) => drawArt(g, spec.mid) : null),
    face: hook(spec.face ? (g) => drawArt(g, spec.face) : null),
    top: hook(scIn("top"), spec.top ? (g) => drawArt(g, spec.top) : null) });
  if (soft > 0.05) softenCanvas(B.canvas, (soft * res) / 2);
  return { ...B, flip: !!spec.flip, hx, hy, xf: spec.xf || null };
}
// spec.xf = [dx, dy, rot, k]: a rigid move of the whole drawing about its head (a held drawing re-used for a
// neighbouring pose, fitted to that pose's silhouette)
export function applyXf(g, B) {
  if (!B.xf) return;
  const [dx, dy, rot, k] = B.xf;
  g.translate(B.hx + dx, B.hy + dy); g.rotate(rot || 0); g.scale(k || 1, k || 1); g.translate(-B.hx, -B.hy);
}
// draw with the drawing's local origin at the anchor (ax, ay) (pixel-index coords), under m
export function drawLate(g, B, ax = 0, ay = 0, m = [1, 0, 0, 1], alpha = 1) {
  g.save();
  g.transform(m[0], m[1], m[2], m[3], ax + 0.5, ay + 0.5);
  applyXf(g, B);
  if (B.flip) g.transform(-1, 0, 0, 1, 2 * B.hx, 0);
  if (alpha !== 1) g.globalAlpha *= alpha;
  g.drawImage(B.canvas, B.x, B.y, B.w, B.h);
  g.restore();
}
