// s24: paint a drawing described as an ordered list of layers (frame / plate px). Each layer type is procedural
// (see art.js); the specs (owlF.js, owlH.js, owlJ.js, whirl.js, page.js) hold measured landmarks and style numbers.
//   sil      a measured silhouette polygon: soft white plumage (rim darker, core pushed to the light), shaded patches,
//            seeded hatching (ring or directional), ink drawn just outside the edge so the white keeps its extent
//   mass     the same on a smooth outline through control points, ink on chosen runs of the outline
//   notch    ink separation strokes running in from measured notch points (between feathers) toward a root/direction
//   row      a clipped row of overlapping lanceolate feathers (tips measured, roots along a polyline)
//   feathers individual feathers { r, t, w, bend }; scallops a scalloped covert line through measured tips
//   ink / poly / ell / shade / hatch   single strokes, flat polygons, ellipses, soft shading, hatching
//   cup / band / bandage / eye / beak / feet / scissors / glint   the owl's parts and props
import { curve, polyPath, smoothFn, inkLine, inkOutline, softFill, shade, hatch, feather, eye, cup, band, INK } from "./art.js";
import { drawScissors, glint } from "./scissors.js";
import { drawBandage, setPPU, gv } from "../../../lib/owlInk.js";
import { cup3, yoke, brow, eye2, hookBeak, tuft, coverts, quill, foot, fineHatch, stroke, lobe, ringArc } from "./art2.js";
import { tufts, ruff, barbs, arches, bandX, contourLines, blobTone, flowDir, clipOf } from "./engr.js";

const LIGHT = [-0.6, -0.8];

function drawFoot(g, f, o = {}) {
  // a talon: plump toes made of knuckle segments (bulging width, creases at the joints), dark hooked claws
  const lw = o.leg ?? 20, tw = o.toe ?? 13, v = o.v ?? 0.9, cl = o.claw ?? 18;
  const toe = (pts, w, fill) => {
    const q = curve(pts, false, 10), n = q.length;
    const wf = (u) => w * (0.82 + 0.18 * Math.abs(Math.sin(u * Math.PI * 3))) * (1 - 0.25 * u);
    taperFn(g, q, (u) => wf(u) + 4, INK);
    taperFn(g, q, (u) => wf(u), gv(fill));
    // creases at the joints
    for (const u of [0.33, 0.66]) {
      const i = Math.round(u * (n - 1)), a = q[Math.max(0, i - 1)], b = q[Math.min(n - 1, i + 1)], d = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(d[0], d[1]) || 1, nn = [-d[1] / l, d[0] / l], h = wf(u) * 0.45;
      inkLine(g, [[q[i][0] + nn[0] * h, q[i][1] + nn[1] * h], [q[i][0] - nn[0] * h * 0.6, q[i][1] - nn[1] * h * 0.6]], 1.6, { a: 0.8, b: 0.2, smooth: false, color: gv(0.2, 0.9) });
    }
    return q;
  };
  toe(f.leg, lw, v);
  for (const t of f.toes) {
    const q = toe(t, tw, v);
    // claw: a dark hook continuing the toe and curling down
    const a = q[q.length - 2], b = q[q.length - 1], d = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(d[0], d[1]) || 1, u = [d[0] / L, d[1] / L], nrm2 = [-u[1], u[0]];
    const side = (o.curl ?? 1);
    const c1 = [b[0] + u[0] * cl * 0.5 + nrm2[0] * side * cl * 0.1, b[1] + u[1] * cl * 0.5 + nrm2[1] * side * cl * 0.1];
    const c2 = [b[0] + u[0] * cl * 0.9 + nrm2[0] * side * cl * 0.45, b[1] + u[1] * cl * 0.9 + nrm2[1] * side * cl * 0.45];
    inkLine(g, [[b[0] - u[0] * 3, b[1] - u[1] * 3], c1, c2], tw * 0.62, { a: 1, b: 0.08, pow: 0.4 });
    if (o.paleClaw !== false) inkLine(g, [[b[0], b[1]], c1, c2], tw * 0.34, { a: 1, b: 0.02, pow: 0.4, color: gv(0.82) });
  }
}
function taperFn(g, q, wf, color) {
  const L = [], R = [], n = q.length;
  for (let i = 0; i < n; i++) {
    const a = q[Math.max(0, i - 1)], b = q[Math.min(n - 1, i + 1)], d = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(d[0], d[1]) || 1, nn = [-d[1] / l, d[0] / l], w = wf(i / (n - 1)) / 2;
    L.push([q[i][0] + nn[0] * w, q[i][1] + nn[1] * w]); R.push([q[i][0] - nn[0] * w, q[i][1] - nn[1] * w]);
  }
  g.fillStyle = color; g.beginPath(); g.moveTo(L[0][0], L[0][1]);
  for (const p of L) g.lineTo(p[0], p[1]);
  // round end caps
  const e = q[n - 1], s0 = q[0], we = wf(1) / 2, ws = wf(0) / 2;
  g.arc(e[0], e[1], we, Math.atan2(L[n - 1][1] - e[1], L[n - 1][0] - e[0]), Math.atan2(R[n - 1][1] - e[1], R[n - 1][0] - e[0]), true);
  for (let i = n - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
  g.arc(s0[0], s0[1], ws, Math.atan2(R[0][1] - s0[1], R[0][0] - s0[0]), Math.atan2(L[0][1] - s0[1], L[0][0] - s0[0]), true);
  g.closePath(); g.fill();
}

function hatchLayer(g, L) {
  const clip = L.clipPoly ? polyPath(L.clipPoly) : L.clip ? smoothFn(L.clip) : null;
  const [cx, cy] = L.center || [0, 0];
  const dir = L.mode === "dir" ? () => L.dir : (p) => { const a = Math.atan2(p[1] - cy, p[0] - cx) + Math.PI / 2 + (L.twist || 0); return [Math.cos(a), Math.sin(a)]; };
  const tone = L.mode === "dir" && !L.rx ? () => L.tone ?? 1 : (p) => {
    const r = Math.hypot((p[0] - cx) / L.rx, (p[1] - cy) / L.ry);
    return Math.max(0, Math.min(1, (r - (L.r0 ?? 0.6)) * (L.gain ?? 2))) * (L.max ?? 0.85);
  };
  hatch(g, clip, L.box, { dir, tone, density: L.dens ?? 1.5, len: L.len ?? [12, 28], w: L.w ?? [0.8, 1.3], color: gv(L.v ?? 0.42, L.alpha ?? 0.7), seed: L.seed ?? 5 });
}

export function paintSpec(g, spec) {
  setPPU(1);
  g.lineJoin = "round"; g.lineCap = "round";
  for (const L of spec.layers) {
    // ending fix: any layer may be confined to a rectangle (clipRect: [x0, y0, x1, y1]) or polygon (clipTo)
    if (L.clipRect || L.clipTo) { g.save(); g.beginPath(); if (L.clipRect) { const [a, b, c, d] = L.clipRect; g.rect(a, b, c - a, d - b); } else polyPath(L.clipTo)(g); g.clip(); paintSpec(g, { layers: [{ ...L, clipRect: null, clipTo: null }] }); g.restore(); continue; }
    switch (L.type) {
      case "feathers": {
        const list = L.order === "rev" ? [...L.list].reverse() : L.list;
        list.forEach((f, i) => feather(g, f, { side: f.side || L.side || "r", barbs: L.barbs ?? 6, barbLen: L.barbLen ?? 0.5, seed: (L.seed || 1) * 37 + i, ink: f.ink ?? L.ink ?? 2.7,
          from: f.from ?? L.from ?? 0.2, hook: f.hook ?? L.hook ?? 0.22, base: L.base ?? 0.95, rootV: L.rootV ?? 0.84, barbV: L.barbV ?? 0.5 }));
        break;
      }
      case "mass": {
        const path = smoothFn(L.pts);
        softFill(g, path, { base: L.base ?? 0.95, rim: L.rim ?? 0.78, light: L.light || LIGHT, depth: L.depth ?? 40, blur: L.blur ?? 24 });
        if (L.shades) for (const s of L.shades) shade(g, path, (q) => q.ellipse(s[0], s[1], s[2], s[3], s[4] || 0, 0, Math.PI * 2), s[5] ?? 0.7, s[6] ?? 0.4, s[7] ?? 24);
        if (L.hatch) for (const h of [].concat(L.hatch)) hatchLayer(g, { ...h, clip: L.pts });
        if (L.ink) {
          const poly = curve(L.pts, true, 10), n = poly.length;
          for (const [i0, i1, w] of L.ink) {
            const a = Math.round(i0 * n), b = Math.round(i1 * n), run = [];
            for (let i = a; i <= b; i++) run.push(poly[((i % n) + n) % n]);
            inkOutline(g, run, w, { light: L.light || LIGHT, k: L.inkK ?? 0.75, closed: false, cw: true });
          }
        }
        break;
      }
      case "ink": inkLine(g, L.pts, L.w, { a: L.a ?? 0.25, b: L.b ?? 0.15, color: L.color ? gv(L.color[0], L.color[1] ?? 1) : INK }); break;
      case "poly": {
        if (L.ink !== 0) { g.strokeStyle = INK; g.lineWidth = L.ink ?? 4; g.beginPath(); (L.smooth ? smoothFn(L.pts) : polyPath(L.pts))(g); g.stroke(); }
        g.fillStyle = gv(L.v ?? 0.9); g.beginPath(); (L.smooth ? smoothFn(L.pts) : polyPath(L.pts))(g); g.fill();
        if (L.hatch) hatchLayer(g, { ...L.hatch, clip: L.pts });
        break;
      }
      case "cup": cup(g, L); break;
      case "band": band(g, L.pts, L); break;
      case "bandage": drawBandage(g, L); break;
      case "eye": eye(g, L); break;
      case "beak": {
        g.fillStyle = gv(L.v ?? 0.9); g.beginPath(); smoothFn(L.out)(g); g.fill();
        if (L.shade) shade(g, smoothFn(L.out), (q) => q.ellipse(L.shade[0], L.shade[1], L.shade[2], L.shade[3], L.shade[4] || 0, 0, Math.PI * 2), 0.5, 0.6, 6);
        if (L.mouth) { g.fillStyle = INK; g.beginPath(); smoothFn(L.mouth)(g); g.fill(); }
        if (L.tongue) { g.fillStyle = gv(0.55); g.beginPath(); smoothFn(L.tongue)(g); g.fill(); }
        inkOutline(g, curve(L.out, true, 8), L.ink ?? 3.6, { light: LIGHT, k: 0.5 });
        break;
      }
      case "feet": for (const f of L.list) drawFoot(g, f, L); break;
      case "scissors": drawScissors(g, L); break;
      case "glint": glint(g, L.x, L.y, L.r, L.rot || 0); break;
      case "shade": shade(g, smoothFn(L.clip), (q) => q.ellipse(L.shape[0], L.shape[1], L.shape[2], L.shape[3], L.shape[4] || 0, 0, Math.PI * 2), L.v ?? 0.7, L.alpha ?? 0.4, L.blur ?? 24); break;
      case "hatch": hatchLayer(g, L); break;
      case "sil": {
        const path = polyPath(L.pts);
        // the ink sits just outside the measured edge (the fill covers its inner half), so the white keeps the
        // measured extent; `glow` adds a soft white aura round the figure first
        if (L.glow) { g.save(); g.filter = `blur(${L.glow[1]}px)`; g.fillStyle = gv(L.glow[0]); g.beginPath(); path(g); g.fill(); g.restore(); }
        if (L.ink !== 0 && L.inkSkip && L.pts.some((p) => L.inkSkip.some((b) => p[0] >= b[0] && p[0] <= b[2] && p[1] >= b[1] && p[1] <= b[3]))) {
          // ink only the runs of the outline outside the `inkSkip` boxes (parts redrawn by hand)
          const P = L.pts, n = P.length, inBox = (p) => L.inkSkip.some((b) => p[0] >= b[0] && p[0] <= b[2] && p[1] >= b[1] && p[1] <= b[3]);
          let A = 0; for (let i = 0; i < n; i++) { const p = P[i], q = P[(i + 1) % n]; A += p[0] * q[1] - q[0] * p[1]; }
          const s0 = P.findIndex(inBox);
          let run = [];
          const flush = () => { if (run.length > 1) inkOutline(g, run, (L.ink ?? 3) * 2, { light: L.light || LIGHT, k: L.inkK ?? 0.6, closed: false, cw: A > 0 }); run = []; };
          for (let j = 0; j <= n; j++) { const p = P[(s0 + j) % n]; if (inBox(p)) flush(); else run.push(p); }
          flush();
        } else if (L.ink !== 0) inkOutline(g, L.pts, (L.ink ?? 3) * 2, { light: L.light || LIGHT, k: L.inkK ?? 0.6 });
        softFill(g, path, { base: L.base ?? 0.95, rim: L.rim ?? 0.8, light: L.light || LIGHT, depth: L.depth ?? 30, blur: L.blur ?? 20 });
        if (L.shades) for (const s of L.shades) shade(g, path, (q) => q.ellipse(s[0], s[1], s[2], s[3], s[4] || 0, 0, Math.PI * 2), s[5] ?? 0.7, s[6] ?? 0.4, s[7] ?? 24);
        if (L.hatch) for (const h of [].concat(L.hatch)) hatchLayer(g, { ...h, clipPoly: L.pts });
        break;
      }
      case "notch": {
        // ink separation lines running in from the measured notches between feathers
        const d0 = L.dir;
        L.notch.forEach((p, i) => {
          if (L.skip && L.skip.includes(i)) return;
          if (L.only && !L.only.includes(i)) return;
          let d = d0;
          if (L.root) { const v = [L.root[0] - p[0], L.root[1] - p[1]], l = Math.hypot(v[0], v[1]) || 1; d = [v[0] / l, v[1] / l]; }
          const len = (L.lens && L.lens[i]) || L.len || 60, n = [-d[1], d[0]], b = (L.bend || 0) * len;
          const pts = [p, [p[0] + d[0] * len * 0.5 + n[0] * b, p[1] + d[1] * len * 0.5 + n[1] * b], [p[0] + d[0] * len, p[1] + d[1] * len]];
          inkLine(g, pts, L.w ?? 3, { a: 0.7, b: 0.05, pow: 0.4 });
        });
        break;
      }
      case "scallops": {
        // a scalloped covert row: U-hooks at the measured tips, the path dipping `depth` back into the wing between them
        const T = L.tips, bk = L.back, D = L.depth ?? 30, pts = [];
        if (L.start) pts.push(L.start);
        for (let i = 0; i < T.length; i++) {
          pts.push(T[i]);
          if (i < T.length - 1) { const m = [(T[i][0] + T[i + 1][0]) / 2 + bk[0] * D, (T[i][1] + T[i + 1][1]) / 2 + bk[1] * D]; pts.push(m); }
        }
        if (L.end) pts.push(L.end);
        inkLine(g, pts, L.w ?? 3, { a: 0.3, b: 0.3, pow: 0.3, per: 10 });
        break;
      }
      case "row": {
        // a row of overlapping feathers: tips measured / hand-read, roots spaced along a polyline inside the wing,
        // painted in order (later ones overlap earlier), clipped to the silhouette
        g.save();
        if (L.clip) { g.beginPath(); polyPath(L.clip)(g); g.clip(); }
        const R = L.roots, n = L.tips.length;
        const seg = []; let tot = 0;
        for (let i = 0; i < R.length - 1; i++) { const l = Math.hypot(R[i + 1][0] - R[i][0], R[i + 1][1] - R[i][1]); seg.push(l); tot += l; }
        const along = (u) => { let d = u * tot; for (let i = 0; i < seg.length; i++) { if (d <= seg[i] || i === seg.length - 1) { const t = seg[i] ? Math.min(1, d / seg[i]) : 0; return [R[i][0] + (R[i + 1][0] - R[i][0]) * t, R[i][1] + (R[i + 1][1] - R[i][1]) * t]; } d -= seg[i]; } return R[R.length - 1]; };
        const order = [...Array(n).keys()]; if (L.order === "rev") order.reverse();
        for (const i of order) {
          const u = n === 1 ? 0.5 : i / (n - 1), w = L.w[0] + (L.w[1] - L.w[0]) * u;
          feather(g, { r: along(u), t: L.tips[i], w, bend: L.bend || 0, rootK: L.rootK ?? 0.9, widest: L.widest ?? 0.55, tipPow: L.tipPow ?? 0.55 },
            { side: L.side || "r", ink: L.ink ?? 2.8, from: L.from ?? 0.35, hook: L.hook ?? 0.3, barbs: L.barbs ?? 4, barbLen: L.barbLen ?? 0.4, seed: (L.seed || 3) * 17 + i, base: L.base ?? 0.95, rootV: L.rootV ?? 0.9, barbV: L.barbV ?? 0.5 });
        }
        g.restore();
        break;
      }
      case "ell": {
        g.save(); if (L.blur) g.filter = `blur(${L.blur}px)`;
        g.fillStyle = gv(L.v ?? 0.05, L.alpha ?? 1); g.beginPath(); g.ellipse(L.c[0], L.c[1], L.rx, L.ry, L.rot || 0, 0, Math.PI * 2); g.fill();
        g.restore();
        break;
      }
      case "fn": L.fn(g); break;
      // fix pass 1 parts (art2.js)
      case "cup3": cup3(g, L); break;
      case "yoke": yoke(g, L.pts, L); break;
      case "brow": brow(g, L.pts, L.w, L); break;
      case "eye2": eye2(g, L); break;
      case "hbeak": hookBeak(g, L); break;
      case "tuft": tuft(g, L.pts, L); break;
      case "coverts": {
        if (L.clip) { g.save(); g.beginPath(); polyPath(L.clip)(g); g.clip(); }
        coverts(g, L.tips, L);
        if (L.clip) g.restore();
        break;
      }
      case "quills": {
        if (L.clip) { g.save(); g.beginPath(); polyPath(L.clip)(g); g.clip(); }
        const list = L.order === "rev" ? [...L.list].reverse() : L.list;
        list.forEach((f, i) => quill(g, f, { ...L, ...f, seed: (L.seed || 1) * 31 + i }));
        if (L.clip) g.restore();
        break;
      }
      case "feet2": for (const f of L.list) foot(g, f, L); break;
      case "fine": {
        const clip = L.clipPoly ? polyPath(L.clipPoly) : L.clip ? smoothFn(L.clip) : null;
        const [cx, cy] = L.center || [0, 0];
        const dir = L.dir ? () => L.dir : (p) => { const a = Math.atan2(p[1] - cy, p[0] - cx) + Math.PI / 2 + (L.twist || 0); return [Math.cos(a), Math.sin(a)]; };
        const tone = L.rx ? (p) => { const r = Math.hypot((p[0] - cx) / L.rx, (p[1] - cy) / L.ry); return Math.max(0, Math.min(1, (r - (L.r0 ?? 0.6)) * (L.gain ?? 2))) * (L.max ?? 1); } : () => L.tone ?? 1;
        fineHatch(g, clip, L.box, { dir, tone, spacing: L.spacing ?? 3.5, len: L.len ?? [10, 26], w: L.w ?? [0.5, 1.0], color: gv(L.v ?? 0.55, L.alpha ?? 0.6), seed: L.seed ?? 9 });
        break;
      }
      case "stroke": stroke(g, L.pts, L.ws, { color: L.color ? gv(L.color[0], L.color[1] ?? 1) : undefined }); break;
      case "lobe": lobe(g, L.pts, L); break;
      case "ringArc": ringArc(g, L); break;
      // ending fix: the engraving pass (engr.js) — fur tufts on a tone field of ellipses along a flow field, ruffs, barbs
      case "tufts": tufts(g, clipOf(L), L.box, { ...L, tone: blobTone(L.blobs || [], L.base ?? 0), dir: flowDir(L.flow || [1, 0], L.centres || []) }); break;
      case "ruff": ruff(g, L.pts, L); break;
      case "bandX": bandX(g, L); break;
      case "contour": contourLines(g, L.poly, L); break;
      case "arches": { const c = clipOf(L); if (c) { g.save(); g.beginPath(); c(g); g.clip(); } arches(g, L.tips, L); if (c) g.restore(); break; }
      case "barbs": { const c = clipOf(L); if (c) { g.save(); g.beginPath(); c(g); g.clip(); } for (const [i, f] of L.list.entries()) barbs(g, f.r, f.t, { ...L, ...f, seed: (L.seed || 1) * 53 + i }); if (c) g.restore(); break; }
    }
  }
}

// cached canvas of a spec (plate size w × h)
export function specLayer(spec, w, h) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  paintSpec(c.getContext("2d", { willReadFrequently: true }), spec);
  return c;
}
