// s15 (40.72–45.72): the corridor run. Seen from low behind, the owl runs and flaps down a narrow alley of stacked
// cardboard boxes, keyboards leaning on them, shelves of gear; the camera chases it. The source is a string of short
// takes joined on held frames (40.92, 41.68, 41.92, 42.68, 42.88, 43.68, 43.88, 44.68, 44.84 and 45.68 repeat the
// frame before). At 44.44 the owl turns to face the camera (a wink, then a wide stare as it runs at us past a big
// speaker), swings to 3/4 at 44.88–45.12, turns away at 45.16 and flies off down the dark alley; the corridor goes
// black (45.44–45.60) and the designer at his desk fades up behind the owl (45.60–45.68) just before the cut to s16.
//
// Pass 4 (roto): the source's corridor is not a rigid set (its drawn boxes slide, swell and change from frame to
// frame), so every take is now drawn from measured screen quads: every visible face of every source frame, picked on
// the frame's coordinate grid (snapshots/s15-p4/roto/<frame>.txt, some propagated by dense flow and corrected by hand),
// each with four corner values fitted to the source's brightness through the inverse grade, a measured stroke
// direction and hatch gain, and a coarse measured floor-value grid (s15/roto{A,B,C,D,E,H,I,J}.js, numbers only). The
// faces go through the corridor shader (s15/gl.js) over a continuous 3D floor, with shutter sub-frames between source
// frames (their count follows the measured motion). Tools: snapshots/s15-p4/tools/ (build, refine, prop, ov, strokes).
// Owl: s15/owl.js (back view; wing turns, flaps and stride measured per frame, sets.js) and s15/owlFront.js (front and
// 3/4 via the owlInk flyToward preset, head placement template-tracked on the source).
// (The fix-pass-2 keyed-box sets in sets.js and their tracks/defs/lights files are no longer used by any take.)
import { W, H } from "../config.js";
import { Plate } from "../lib/engrave.js";
import { taper } from "../lib/ink.js";
import { sampleCurve } from "../lib/paths.js";
import { CorridorGL, camMatrix } from "./s15/gl.js";
import { buildAtlas } from "./s15/atlas.js";
import { SETS, DUPS, resolveT } from "./s15/sets.js";
import { drawOwlBack } from "./s15/owl.js";
import { drawOwlFront } from "./s15/owlFront.js";
import { viewOf } from "./s15/author.js";
import { owlTrack } from "./s15/track.js";
import { rotoFaces, rotoFloor, rotoMotion } from "./s15/roto.js";

// The last frames fade up the next shot's room (the designer at his desk): borrow s16's scene painter if it loads.
let S16 = null;
try { S16 = await import("./s16/scene.js"); } catch (e) { S16 = null; }

// the corridor goes dark as the owl flies off (scenery gain, from frame means with the owl removed)
const DIM = [[45.40, 1], [45.44, 0.87], [45.48, 0.72], [45.52, 0.4], [45.56, 0.17], [45.60, 0.05], [45.64, 0]];
// the designer's room fading up (fraction of its s16 brightness)
const UP = [[45.56, 0], [45.60, 0.2], [45.64, 0.5]];
const tab = (T, t) => {
  if (t <= T[0][0]) return T[0][1];
  for (let i = 1; i < T.length; i++) if (t <= T[i][0] + 1e-6) { const a = T[i - 1], b = T[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); }
  return T[T.length - 1][1];
};

let R = null;
function renderer() {
  if (R) return R;
  const gl = new CorridorGL(W, H);
  gl.setAtlas(buildAtlas());
  for (const s of SETS) if (s.faces) { const f = s.faces(); gl.upload(s.key, f); if (f.dyn) for (const x of SETS) if (x.faces === s.faces) x.dyn = f.dyn; }
  R = { gl, room: null };
  return R;
}
// s16's room (built lazily, only for the last frames), with its steam (copied from s16.js)
const M16 = 90;
const STEAM = [
  [[800, 690], [786, 645], [812, 608], [838, 572], [830, 540], [790, 510], [776, 490], [800, 462], [826, 440], [828, 425]],
  [[795, 692], [768, 650], [762, 625], [790, 592], [798, 572], [770, 545], [742, 520], [743, 505], [760, 488]],
];
function room16() {
  if (!S16) return null;
  if (R.room) return R.room;
  try {
    const P = new Plate(W + 2 * M16, H + 2 * M16, 1);
    for (const g of [P.v, P.d, P.o]) g.translate(M16, M16);
    S16.paintScene(P);
    const c = P.engrave({ spacing: 4.4, seed: 16, contrast: 1.0 });
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const g = cv.getContext("2d");
    g.drawImage(c, -M16, -M16);
    try { S16.drawEyes(g, 0.4); } catch (e) { /* optional */ }
    const k = Math.floor(Math.round(45.64 * 25) / 3);
    STEAM.forEach((pts, j) => {
      const q = sampleCurve(pts.map(([x, y], i) => [x + Math.sin(k * 1.7 + i * 0.9 + j * 2) * 3 * (i / pts.length), y]), 8);
      taper(g, q, (u) => 4.2 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.05)), 0.7), "rgba(242,240,234,0.9)");
    });
    R.room = cv;
  } catch (e) { S16 = null; R.room = null; }
  return R.room;
}

function setAt(t) {
  let s = SETS[0];
  for (const x of SETS) if (t >= x.t0 - 1e-6) s = x;
  return s;
}
const resolve = resolveT;
const LIGHT = [2.4, 0.4, 2.6, 1.3], LIGHT2 = [1.0, 1.0, 2.2, 0.08], FACE = [0.62, 1.0, 0.55, 1.3], TEX = [0.36, 0.95, 0.12, 6.0];

export const shot = {
  draw(ctx, local, t) {
    // hold each 25 fps source frame (a no-op in the film render; keeps previews on the source's frames)
    t = Math.round(t * 25) / 25;
    const tf = resolve(t);
    const { gl } = renderer();
    const set = setAt(tf);
    // roto takes carry the source's own brightness in their measured faces (the dimming included), so only the 3D
    // floor under them takes the dimming; the other takes dim as a whole
    const dim0 = tab(DIM, tf), dim = set.roto ? (tf >= 45.6 - 1e-6 ? 0 : 1) : dim0;
    if (dim > 0.001) {
      // (roto takes: as many shutter sub-frames as the frame's measured motion needs, 1 when it is still)
      const shutter = set.shutter ?? 0.006;
      let N = set.blurN ?? 4;
      if (set.roto) { const mv = rotoMotion(set.roto, tf) * shutter * 25; N = Math.max(1, Math.min(7, Math.ceil(mv / 5))); }
      const subs = [];
      // keyed (moving) boxes of this set, placed at each sub-frame's time (so they blur with the camera)
      for (let i = 0; i < N; i++) {
        const ts = tf - shutter * (i / Math.max(1, N - 1));
        const keys = [set.key];
        if (set.dyn) { gl.upload("dyn" + i, set.dyn(ts)); keys.push("dyn" + i); }
        const c = set.cam(ts);   // before t0 the path extrapolates: a take's first frame is blurred too
        // roto faces: the source's box faces measured frame by frame, drawn over the 3D floor in their own order
        if (set.roto) { gl.upload("roto" + i, rotoFaces(set.roto, tf, ts, c), { noDepth: true }); keys.push("roto" + i); }
        const M = camMatrix(c.eye, c.yaw, c.pitch, c.roll, c.fov, W, H);
        // the owl's glow sits where its feet meet the floor (back-projected from the measured track)
        const ot = owlTrack(tf), fp = viewOf(c).floor(ot[1], Math.min(940, ot[2] + ot[4] * 0.62));
        const owlW = fp[2] > c.eye[2] + 0.2 && fp[2] < c.eye[2] + 6 ? [fp[0], 0.18, fp[2]] : [c.eye[0], 0.18, c.eye[2] + 1.2];
        // light = camera falloff [radius, start, power, -]; light2 = the owl's light [gain, radius, power, edge ink];
        // face = [camera fill, top faces, floor gain, wrap power]; tex = hatching [width, strength, mottle, mottle]
        const ex = typeof set.exp === "function" ? set.exp(tf) : set.exp ?? 1;
        subs.push({ key: set.key, keys, vp: M.m, cam: c.eye, owl: owlW, light: set.light ?? LIGHT, light2: set.light2 ?? LIGHT2, tex: set.tex ?? TEX, grade: [1.3 * ex, 1.25, ex, 0], face: set.face ?? FACE, floor: typeof set.floor === "function" ? set.floor(tf) : set.floor, floor2: set.roto && set.floor2 ? [set.floor2[0], set.floor2[1], set.floor2[2], 1 - dim0] : set.floor2, fg: set.roto ? rotoFloor(set.roto, tf, ts) : null });
      }
      const img = gl.render(subs, 1);
      ctx.globalAlpha = dim;
      ctx.drawImage(img, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    const up = tab(UP, tf);
    if (up > 0.001) {
      const room = room16();
      if (room) { ctx.globalAlpha = up; ctx.drawImage(room, 0, 0, W, H); ctx.globalAlpha = 1; }
    }
    const ot = owlTrack(tf);
    if (!drawOwlFront(ctx, tf, ot)) {
      const o = set.owl(tf);
      if (o) drawOwlBack(ctx, o.x, o.y, o.s, o.pose);
    }
  },
  release() { if (R) { R.gl.dispose(); R = null; } },
};
