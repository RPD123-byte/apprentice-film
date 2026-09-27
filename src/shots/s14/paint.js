import { bakeVec } from "./kit.js";
// s14 room plates for the compositor. The source room is a soft dry-brush ink painting: every surface carries
// streaks running along its grain, cloudy mottling, charcoal gathered along every contour and into corners,
// cross-hatching in the shadows and heavy brushy outlines. That finish is computed per screen pixel by the layer
// shader in s14/gl.js (fix pass 1; it used to be baked here once per layer, which magnified with the dolly).
// This module packs a Plate (value, direction, overlay) and its coverage into textures, with an occlusion map.
//
// dir map (engrave.js encoding): R = angle/pi, G = spacing scale, B = style (0 lines/grain, 1 cross-hatch, 2 flat,
// 4 the floor's print halftone).
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
// occlusion maps: R = dark ink density blurred tight, G = blurred wide, B = the layer coverage blurred
function occMap(overC, covC, sc, { r1 = 5, r2 = 16, r3 = 12 } = {}) {
  const w = overC.width, h = overC.height;
  const dk = mk(w, h), g = dk.getContext("2d");
  g.drawImage(overC, 0, 0);
  const im = g.getImageData(0, 0, w, h), D = im.data;
  for (let i = 0; i < D.length; i += 4) {
    const l = (D[i] + D[i + 1] + D[i + 2]) / 765, a = D[i + 3] / 255;
    const k = Math.round(255 * a * Math.max(0, 1 - l * 1.6));
    D[i] = D[i + 1] = D[i + 2] = k; D[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  const out = mk(w, h), o = out.getContext("2d");
  o.fillStyle = "#000"; o.fillRect(0, 0, w, h);
  const chan = (src, r, color) => {
    const t = mk(w, h), tg = t.getContext("2d");
    tg.fillStyle = "#000"; tg.fillRect(0, 0, w, h);
    tg.filter = `blur(${(r * sc).toFixed(1)}px)`; tg.drawImage(src, 0, 0); tg.filter = "none";
    tg.globalCompositeOperation = "multiply"; tg.fillStyle = color; tg.fillRect(0, 0, w, h);
    o.globalCompositeOperation = "lighter"; o.drawImage(t, 0, 0);
  };
  chan(dk, r1, "#ff0000");
  chan(dk, r2, "#00ff00");
  if (covC) {
    const cv = mk(w, h), cg = cv.getContext("2d");
    cg.fillStyle = "#000"; cg.fillRect(0, 0, w, h); cg.drawImage(covC, 0, 0);
    chan(cv, r3, "#0000ff");
  } else { o.globalCompositeOperation = "lighter"; o.fillStyle = "#0000ff"; o.fillRect(0, 0, w, h); }
  o.globalCompositeOperation = "source-over";
  // the dark-ink maps are sparse: boost them so a contour darkens its neighbourhood noticeably
  return out;
}

// fix pass 1: the finish moved into the compositor (s14/gl.js) so its line patterns stay fine as the camera closes
// in. A layer is packed into two RGBA8 textures:
//   A = [value x coverage, angle, style * 32 + spacing (5 bits), coverage]   (angle/style read unfiltered)
//   B = [overlay luma x alpha, overlay alpha, dark ink nearby (occlusion), coverage blurred]
// vec: the layer's recorded ink strokes (kit.js recorder), baked into the occlusion map only.
export function packLayer(P, covC, vec, sc, idC = null) {
  const w = P.valC.width, h = P.valC.height;
  // occlusion from the overlay plus the recorded strokes at their plate widths
  const ov = mk(w, h), og = ov.getContext("2d");
  og.drawImage(P.overC, 0, 0);
  og.save(); og.scale(sc, sc);
  const T = P.o.getTransform();   // the plate's own offset (layer rect origin)
  og.setTransform(T.a, T.b, T.c, T.d, T.e, T.f);
  bakeVec(og, vec);
  og.restore();
  const occ = occMap(ov, covC, sc);
  const get = (c) => c.getContext("2d").getImageData(0, 0, w, h).data;
  const V = get(P.valC), D = get(P.dirC), O = get(P.overC), Q = get(occ), K = covC ? get(covC) : null;
  const A = new Uint8Array(w * h * 4), B = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h * 4; i += 4) {
    const cv = K ? K[i + 3] : 255;
    A[i] = Math.round((V[i] * cv) / 255);
    A[i + 1] = D[i];
    A[i + 2] = Math.min(4, D[i + 2]) * 32 + (D[i + 1] >> 3);
    A[i + 3] = cv;
    const oa = O[i + 3];
    B[i] = Math.round(((0.299 * O[i] + 0.587 * O[i + 1] + 0.114 * O[i + 2]) * oa) / 255);
    B[i + 1] = oa;
    B[i + 2] = Math.min(255, Math.round(0.55 * Q[i] + 0.45 * Q[i + 1]));
    B[i + 3] = Q[i + 2];
  }
  // fill ids: the canvas antialiases the id fills, so a seam texel can hold a blend of two ids (some third fill's
  // id): replace any texel that matches none of its four neighbours by its left (or upper) neighbour
  let I = null;
  if (idC) {
    const R = get(idC);
    I = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) I[i] = R[4 * i + 3] > 127 ? R[4 * i] : 0;
    const J = I.slice();
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x, v = I[i];
      if (v !== I[i - 1] && v !== I[i + 1] && v !== I[i - w] && v !== I[i + w]) J[i] = I[i - 1] || I[i - w];
    }
    I = J;
  }
  return { A, B, I, w, h, vec };
}
