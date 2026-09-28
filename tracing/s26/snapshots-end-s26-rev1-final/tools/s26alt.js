// s26 (110.52–117.52) — the shattered page blows out into colour and the finished colour site is revealed.
// End fix round 1 (2026-09-27): per the user's decision for the colour ending (STYLE.md), everything in this shot except
// the standing owl of beat A is TRACED from the source — vector traces (colour regions + ink lines, stored as numbers /
// polygon strings in s26/*.js and painted by code; no source pixels). See fidelity/s26.md for method and numbers.
// Beats (film time, measured on the source frame by frame):
//   A 110.52–111.52  the cracked page on the lit screen (crack web, impact stars, stuck scissors, the owl's shadow, room
//                    glow: one trace of the median A frame, s26/pageKeyA.js) under s25's own standing owl drawing (so
//                    the owl is the same on both sides of the 110.52 cut). Camera: the ORB zoom s 1.0029 → 1.0 about
//                    (1150, 950).
//   B 111.56         the jolt frame: the page thrown up and shrunk (x' = 0.9911x − 8.5, y' = 0.9905y − 19.6), no glow.
//   C 111.60–112.68  the blast: the shard field traced at key frames (s26/fieldKeysC.js, owl and scissors removed) and
//                    carried by the field's measured affine (s26/fieldCam.js); 111.80 (the shake) is its own key; the
//                    flung scissors (s26/scissorsTrace.js) and the white owl throwing its wings open
//                    (s26/owlTraceCD.js) traced on every frame.
//   D 112.72–113.64  the colour page arrives (hippie pageArrival) through the ring of B&W shards, traced at key frames
//                    (s26/ringKeysD.js) and carried by the ring's measured zoom RING_D; the white owl hovering over the
//                    designer and the scissors traced per frame.
//   E 113.68–114.12  the huge out-of-focus shard across the lens and the ring's last shards, traced per frame
//                    (s26/lensTraceE.js; the lens shard traced coarse from a blurred copy and painted blurred).
//   F 114.08–117.52  the colour owl (cream, orange headphones — the same character as s27 / s40) climbs to the top-right
//                    box by the nav and perches: traced per frame (s26/owlTraceF.js) over the settling colour page.
import { hippiePageCanvas, pageArrival, releaseHippie } from "/src/lib/hippie.js";
import { rng } from "/src/lib/rng.js";
import { FIELD_CAM } from "/src/shots/s26/fieldCam.js";
import { tracedLayer, paintTrace } from "/src/shots/s26/trace.js";
import { PAGEA } from "/src/shots/s26/pageKeyA.js";
import { FIELDK, FIELDK_KEYS } from "/src/shots/s26/fieldKeysC.js";
import { RINGK, RINGK_KEYS } from "/src/shots/s26/ringKeysD.js";
import { LENS_E, LENS_E_F0 } from "/src/shots/s26/lensTraceE.js";
import { OWL_CD, OWL_CD_F0 } from "/src/shots/s26/owlTraceCD.js";
import { OWL_F, OWL_F_F0 } from "/src/shots/s26/owlTraceF.js";
import { SC_T, SC_T_F0 } from "/src/shots/s26/scissorsTrace.js";
// beat A's owl is s25's standing drawing (read-only imports from s25's own modules), so the same drawing is on both
// sides of the 110.52 cut (the source only un-squashes the frame there)
import { paintDrawing, blitLayer } from "/src/shots/s25/v2/draw.js";
import { DRAW } from "/src/shots/s25/v2/drawings.js";
import { SCHED, SCHED_F0 } from "/src/shots/s25/v2/sched.js";
import { HEAD, HEAD_F0 } from "/src/shots/s25/v2/headtrack.js";
import { face, headphonesBack, headphonesFront, headOutline } from "/src/shots/s25/v2/head.js";
import { D_HEAD } from "/src/shots/s25/v2/data/head.js";
import { W, H } from "/src/config.js";
// end-s26-rev1 REVIEW EXPERIMENT (not loaded by the film): s26.js copied with two switches read from this module's URL:
//   ?noowl=1  beat A/B without s25's owl drawing (the source's own owl is in the traced key PAGEA[0])
//   ?lut=1    a per-channel tone LUT (quantile-matched to the source, 0.7 strength, tapered at the ends) on the painted frame
const Q = new URL(import.meta.url).searchParams;
const NOOWL = Q.get("noowl") === "1", USELUT = Q.get("lut") === "1";
const LUT = {"AE": [[0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255], [0, 1, 2, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255], [0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 212, 213, 214, 215, 216, 217, 218, 219, 220, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255]], "F": [[0, 2, 5, 8, 10, 11, 11, 12, 13, 13, 14, 15, 16, 17, 17, 18, 19, 20, 21, 22, 23, 24, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 208, 209, 210, 211, 212, 213, 213, 214, 215, 215, 216, 217, 218, 219, 220, 220, 222, 222, 223, 225, 226, 227, 228, 229, 230, 232, 233, 234, 236, 237, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255], [0, 2, 4, 7, 9, 10, 11, 11, 12, 13, 14, 14, 15, 16, 17, 18, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 232, 234, 234, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255], [0, 4, 7, 10, 14, 14, 15, 16, 16, 17, 17, 17, 18, 18, 19, 19, 20, 21, 21, 22, 23, 24, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 38, 39, 40, 41, 42, 43, 44, 45, 46, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 151, 152, 153, 154, 155, 156, 157, 158, 159, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 183, 184, 185, 186, 187, 188, 189, 190, 191, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255]]}; // BGR per group
function applyLut(ctx, F) {
  const L = F >= 2854 ? LUT.F : LUT.AE, id = ctx.getImageData(0, 0, 2206, 946), d = id.data;
  const r = L[2], g = L[1], b = L[0];
  for (let i = 0; i < d.length; i += 4) { d[i] = r[d[i]]; d[i + 1] = g[d[i + 1]]; d[i + 2] = b[d[i + 2]]; }
  ctx.putImageData(id, 0, 0);
}


const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
let C = null; // caches, built lazily inside draw
const caches = () => (C || (C = {}));
const FR = (t) => Math.round(t * 25); // source frame index
const mat = (m) => new DOMMatrix([m[0], m[3], m[1], m[4], m[2], m[5]]);

// piecewise-linear keys [[t, a, b, ...], ...]
function interp(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  const n = keys.length;
  if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0;
  while (keys[i + 1][0] < t) i++;
  const a = keys[i], b = keys[i + 1], u = (t - a[0]) / (b[0] - a[0]);
  return a.slice(1).map((v, k) => v + (b[k + 1] - v) * u);
}
// the nearest key frame (ties to the earlier one)
function nearestKey(keys, F) {
  let K = keys[0];
  for (const k of keys) if (Math.abs(k - F) < Math.abs(K - F)) K = k;
  return K;
}
// a traced frame painted once into a cached full-frame canvas (opaque black under it, or transparent)
function keyCanvas(slot, fr, opaque) {
  const c = caches();
  if (c[slot + "K"] !== fr) {
    if (!c[slot]) c[slot] = mk(W, H);
    const g = c[slot].getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    if (opaque) { g.fillStyle = "#000"; g.fillRect(0, 0, W, H); }
    paintTrace(g, fr);
    c[slot + "K"] = fr;
  }
  return c[slot];
}
// a per-frame traced layer (owl, scissors), feathered at its zone's edge
function layer(slot, frames, F0, F, feather) {
  const i = Math.min(frames.length - 1, Math.max(0, F - F0)), c = caches();
  if (!c[slot]) c[slot] = {};
  if (c[slot + "F"] !== i) { tracedLayer(frames[i], W, H, c[slot], feather); c[slot + "F"] = i; }
  return c[slot].c;
}
// the colour page under a page->frame similarity
function drawColourPage(ctx, s, tx, ty) {
  ctx.save();
  ctx.setTransform(s, 0, 0, s, tx, ty);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(hippiePageCanvas(), 0, 0);
  ctx.restore();
}

// ================================================================ A / B: the cracked page on the screen
// Everything in A is drawn in STAGE px = the pre-squash frame of s25 (s25 squashes its whole frame vertically by 0.9836
// at 108.08; the source un-squashes at the 110.52 cut). The A camera (ORB affine against the pre-squash frame 107.88,
// per frame): s 1.0029 at 110.52 easing to 1.0 by 111.52, fixed point ≈ (1150, 950).
const CAM_A = [[110.52, 1.0029], [110.64, 1.0027], [110.8, 1.0015], [111.0, 1.0008], [111.2, 1.0006], [111.4, 1.0003], [111.52, 1.0]];
// The page, cracks, stars, stuck scissors, the owl's shadow: PAGEA[0], the median of the 26 A frames moved to the
// settled camera, traced (stage px). The room glow round the screen: PAGEA[1], traced from a blurred copy in fine tone
// steps and softened 4 px (traced with the page it came out in visible bands). The jolt frame (B) has no room light:
// the page alone, clipped to the screen (stage x 143–2020, y 128–914, measured on the median and on 111.56).
// (The source's own owl is in the traced key too. Drawn without s25's drawing on top, A scores 2.71 against 3.05 at
// σ8, but then the owl would change design at the 110.52 cut, since s25 draws its own. So s25's drawing is on top.)
const SCREEN_A = [143, 128, 1877, 786];
function stageA(glow) {
  const c = caches(), k = glow ? "frameA" : "jolt";
  if (!c[k]) {
    c[k] = mk(W, H); const g = c[k].getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    if (glow) {
      const t = mk(W, H), q = t.getContext("2d");
      q.fillStyle = "#000"; q.fillRect(0, 0, W, H); paintTrace(q, PAGEA[1]);
      g.save(); g.beginPath(); g.rect(0, 0, W, H); g.rect(...SCREEN_A); g.clip("evenodd");
      g.filter = "blur(4px)"; g.drawImage(t, 0, 0); g.filter = "none"; g.restore();
    }
    g.save(); g.beginPath(); g.rect(...SCREEN_A); g.clip();
    paintTrace(g, PAGEA[0]);
    g.restore();
    if (!NOOWL) g.drawImage(owlAStage(), 0, 0);
  }
  return c[k];
}
function drawA(ctx, t) {
  const [s] = interp(CAM_A, t);
  ctx.save();
  ctx.setTransform(s, 0, 0, s, (1 - s) * 1150, (1 - s) * 950);
  ctx.drawImage(stageA(1), 0, 0);
  ctx.restore();
}

// The standing owl of beat A is s25's own drawing of this pose (s25/v2: the "hips2" body drawing and the head layer
// with sly eyes), placed with s25's measured affines of its last frame (110.48, F2762) in stage px. s25 then squashes
// its whole frame by 0.9836; the source un-squashes at the cut and the owl holds (its head and body move with the
// page to < 2 px through A), so drawing it here un-squashed gives the identical owl on both sides of the cut.
const A_F = 2762;
function owlAStage() {
  const c = caches();
  if (!c.owlAS) {
    c.owlAS = mk(W, H);
    const g = c.owlAS.getContext("2d");
    const row = SCHED[Math.min(SCHED.length - 1, A_F - SCHED_F0)];
    blitLayer(g, paintDrawing(DRAW[row[0]]), row.slice(1));
    const HL = paintDrawing(D_HEAD, { bb: [900, 250, 1285, 560], pre: headphonesBack, post: (q) => { headOutline(q, D_HEAD.hull); face(q, "sly"); headphonesFront(q); }, fade: [522, 552] });
    blitLayer(g, HL, HEAD[Math.min(HEAD.length - 1, A_F - HEAD_F0)]);
  }
  return c.owlAS;
}


// ================================================================ C: the blast
// The shard field (with the frame's speed lines and the blast's white streaks) is the source's own, traced at key
// frames with the owl and the scissors removed (s26/fieldKeysC.js), carried to each frame by the field's measured
// affine FIELD_CAM (key -> frame). 111.80 is a double-exposed shake frame: its own key, drawn as traced.
const SHAKE_F = 2795;
function drawFieldC(ctx, F) {
  const Fc = Math.min(2817, Math.max(2790, F));
  const K = Fc === SHAKE_F ? SHAKE_F : nearestKey(FIELDK_KEYS.filter((k) => k !== SHAKE_F), Fc);
  const M = mat(FIELD_CAM.cam[Fc]).multiply(mat(FIELD_CAM.cam[K]).inverse());
  ctx.save();
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  ctx.setTransform(M); ctx.imageSmoothingQuality = "high";
  ctx.drawImage(keyCanvas("fk", FIELDK[FIELDK_KEYS.indexOf(K)], true), 0, 0);
  ctx.restore();
}
// the two flung pairs of scissors with their loop echoes (111.60–113.68) and the white owl (111.60–113.92), traced on
// every source frame
function scissorsT(ctx, F) {
  if (F < SC_T_F0 || F >= SC_T_F0 + SC_T.length) return;
  ctx.drawImage(layer("scT", SC_T, SC_T_F0, F, 3), 0, 0);
}
const owlCD = (F) => layer("owlCD", OWL_CD, OWL_CD_F0, F, 3);
function paintC(ctx, F) {
  drawFieldC(ctx, F);
  scissorsT(ctx, F);
  ctx.drawImage(owlCD(F), 0, 0);
}

// ================================================================ D: the colour page arrives through the ring
// RING_D: the ring's own motion per source frame, measured (ORB similarity frame to frame on the ring, left and right
// halves, chained): zoom s and translation (tx, ty) relative to 112.72 — it creeps out slowly, then accelerates (1.09 by
// 113.28, 1.33 by 113.68).
const RING_D = [[2818, 1.0, 0.0, 0.0],
   [2819, 1.0021, 4.7, -1.4],
   [2820, 1.0033, 4.9, 1.5],
   [2821, 1.0065, 0.8, 1.2],
   [2822, 1.0119, -5.9, 0.0],
   [2823, 1.0173, -10.0, -2.4],
   [2824, 1.0206, -10.8, -4.5],
   [2825, 1.0234, -14.2, -3.2],
   [2826, 1.0292, -22.1, -8.8],
   [2827, 1.0358, -25.8, -13.4],
   [2828, 1.0431, -32.6, -15.9],
   [2829, 1.0508, -40.4, -19.4],
   [2830, 1.0629, -49.5, -26.2],
   [2831, 1.0764, -62.3, -33.6],
   [2832, 1.0896, -78.2, -38.5],
   [2833, 1.1036, -94.0, -46.2],
   [2834, 1.1227, -112.0, -57.0],
   [2835, 1.1418, -132.1, -65.8],
   [2836, 1.1627, -154.9, -77.5],
   [2837, 1.1847, -177.8, -86.5],
   [2838, 1.2124, -206.2, -102.2],
   [2839, 1.2124, -206.2, -102.3],
   [2840, 1.2406, -236.7, -115.8],
   [2841, 1.2765, -275.5, -134.2],
   [2842, 1.3215, -326.1, -155.8],
   [2843, 1.3682, -372.1, -181.4],
   [2844, 1.3736, -374.2, -188.1],
   [2845, 1.376, -372.1, -192.9],
   [2846, 1.3791, -373.2, -197.2],
   [2847, 1.3838, -374.3, -209.6],
   [2848, 1.4456, -429.8, -270.6],
   [2849, 1.4504, -434.9, -270.9],
   [2850, 1.4526, -435.2, -272.7],
   [2851, 1.4572, -440.6, -275.1]];
// The ring (and the owl's dark motion ghost) is the source's own, traced at key frames with the owl and the scissors
// removed, transparent where the arriving page shows (s26/ringKeysD.js), carried to each frame by RING_D (key -> frame).
function drawRingKeys(ctx, F) {
  const Fc = Math.min(2841, Math.max(2818, F)), K = nearestKey(RINGK_KEYS, Fc);
  const [s1, x1, y1] = interp(RING_D, K), [s2, x2, y2] = interp(RING_D, Fc), k = s2 / s1;
  ctx.save(); ctx.setTransform(k, 0, 0, k, x2 - k * x1, y2 - k * y1); ctx.imageSmoothingQuality = "high";
  ctx.drawImage(keyCanvas("rk", RINGK[RINGK_KEYS.indexOf(K)], false), 0, 0); ctx.restore();
}
function paintD(ctx, t, F) {
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  const A = pageArrival(Math.max(112.7, t));
  drawColourPage(ctx, A.s, A.tx, A.ty);
  drawRingKeys(ctx, F);
  scissorsT(ctx, F);
  ctx.drawImage(owlCD(F), 0, 0);
}

// ================================================================ E: the out-of-focus shard across the lens
// 113.68–114.12 (F2842–2853): a huge B&W shard right at the lens, far out of focus, sweeps from the lower left to the
// upper right. Per source frame (s26/lensTraceE.js): [back] the ring's last shards, [front] the lens shard, traced coarse
// from a blurred copy and painted blurred 7 px over the owls.
function paintE(ctx, t, F) {
  const E = LENS_E[Math.min(LENS_E.length - 1, Math.max(0, F - LENS_E_F0))];
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  const A = pageArrival(Math.max(112.7, t));
  drawColourPage(ctx, A.s, A.tx, A.ty);
  paintTrace(ctx, E[0]);
  scissorsT(ctx, F);
  if (F <= 2848) ctx.drawImage(owlCD(F), 0, 0);
  if (F >= 2852) ctx.drawImage(owlF(F), 0, 0);
  const c = caches();
  if (!c.lensE) c.lensE = mk(W, H);
  const g = c.lensE.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  paintTrace(g, E[1], { seam: 1.5 });
  ctx.save(); ctx.filter = "blur(7px)"; ctx.drawImage(c.lensE, 0, 0); ctx.restore();
}

// ================================================================ F: the colour owl over the settling page
// the colour owl, traced on every source frame 114.08–117.48 (s26/owlTraceF.js)
const owlF = (F) => layer("owlF", OWL_F, OWL_F_F0, F, 1.5);
// the fine white glitter the owl sheds as it climbs (115.28–115.96): each source frame from 115.28 to 115.72 drops a
// seeded puff of 1–2 px specks round the owl's lower body, which stay where they fell, sink a little and fade over 6
// frames. GLITTER_BODY: [F, x, y, rx, ry] of the owl's body (measured in the earlier fix passes)
const GLITTER_BODY = [[2882,1488.3,429.7,83,106.7],[2883,1499.4,419.1,83,104.1],[2884,1509.6,403.1,82.1,101.6],[2885,1518.2,383.6,80.4,97.5],[2886,1536.1,367.8,78.4,93.8],[2887,1563.4,357.9,76.2,90.4],[2888,1582.6,349,74.6,88.7],[2889,1595.3,338.9,73.8,87.1],[2890,1608,327.9,73.1,83.8],[2891,1624.4,318.2,70.4,81.6],[2892,1644,308.1,65.9,79.7],[2893,1661.6,294.5,63.4,77.6]];
function drawGlitter(ctx, F) {
  ctx.save(); ctx.fillStyle = "#fffaf0";
  for (let e = Math.max(2882, F - 6); e <= Math.min(2893, F); e++) {
    const [, bx, by, rx, ry] = GLITTER_BODY[e - 2882], age = F - e, r = rng(9000 + e);
    ctx.globalAlpha = 0.75 * (1 - age / 7);
    for (let i = 0; i < 40; i++) {
      const u = r(), v = r(), x = bx + (u * 2.6 - 2.2) * rx, y = by + (-0.2 + v * 2.2) * ry + age * 1.5, sz = 1 + r() * 1.2;
      ctx.fillRect(x, y, sz, sz);
    }
  }
  ctx.restore();
}
function paintF(ctx, t, F) {
  const A = pageArrival(t);
  drawColourPage(ctx, A.s, A.tx, A.ty);
  drawGlitter(ctx, F);
  ctx.drawImage(owlF(F), 0, 0);
}

function drawInner(ctx, local, t0) {
  {
    // snap to the source frame: exact at the render's k/25 times, and it pairs tools/compare.sh (whose seeks land up
    // to 1/30 s early) with the right source frame (same rule as s25)
    const t = Math.ceil(t0 * 25 - 0.001) / 25, F = FR(t);
    if (F <= 2788) { drawA(ctx, t); return; }
    if (F === 2789) {
      // B (111.56): the jolt frame — the page thrown up and shrunk (affine vs stage: x' = 0.9911x − 8.5,
      // y' = 0.9905y − 19.6), the room light gone
      ctx.save(); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      ctx.setTransform(0.9911, 0, 0, 0.9905, -8.5, -19.6); ctx.drawImage(stageA(0), 0, 0); ctx.restore();
      return;
    }
    if (F <= 2817) { paintC(ctx, F); return; }
    if (F <= 2841) { paintD(ctx, t, F); return; }
    if (F <= 2853) { paintE(ctx, t, F); return; }
    paintF(ctx, t, F);
  }
}
export const shot = {
  draw(ctx, local, t0) {
    ctx.save(); drawInner(ctx, local, t0); ctx.restore();
    if (USELUT) { const F = Math.round(Math.ceil(t0 * 25 - 0.001)); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); applyLut(ctx, F); ctx.restore(); }
  },
  release() { C = null; releaseHippie(); },
};

