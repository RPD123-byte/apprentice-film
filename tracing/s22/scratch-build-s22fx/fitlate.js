// measuring aid (not part of the film): fit a late spec to the source silhouette of drawing arg.name (the source's
// owl silhouette as measured in pass 3, s22/owlData.js sil rings) by Nelder-Mead on the sprite's own alpha.
const L = await imp("./src/shots/s22/late.js");
const O21 = await imp("./src/shots/s22/owl21.js");
const P21 = await imp("./src/shots/s22/poses21.js");
const D = await imp("./src/shots/s22/owlData.js");
const A = arg || {};
const T = D.TRACED[A.name];
const dec = (str) => { const p = str.split(","), o = []; let x = 0, y = 0; for (let i = 0; i < p.length; i += 2) { x += parseInt(p[i], 36); y += parseInt(p[i + 1], 36); o.push([x / 10 + T.o[0], y / 10 + T.o[1]]); } return o; };
const rings = T.sil.map(dec);
let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
for (const r of rings) for (const p of r) { bx0 = Math.min(bx0, p[0]); by0 = Math.min(by0, p[1]); bx1 = Math.max(bx1, p[0]); by1 = Math.max(by1, p[1]); }
const PAD = A.pad ?? 40;
bx0 = Math.floor(bx0 - PAD); by0 = Math.floor(by0 - PAD); bx1 = Math.ceil(bx1 + PAD); by1 = Math.ceil(by1 + PAD);
const MW = bx1 - bx0, MH = by1 - by0;
const mc = document.createElement("canvas"); mc.width = MW; mc.height = MH;
const mg = mc.getContext("2d", { willReadFrequently: true });
mg.setTransform(1, 0, 0, 1, 0.5 - bx0, 0.5 - by0); mg.beginPath();
for (const r of rings) { mg.moveTo(r[0][0], r[0][1]); for (const p of r.slice(1)) mg.lineTo(p[0], p[1]); mg.closePath(); }
mg.fillStyle = "#fff"; mg.fill("evenodd");
const md = mg.getImageData(0, 0, MW, MH).data, M = new Uint8Array(MW * MH);
for (let i = 0; i < M.length; i++) M[i] = md[i * 4 + 3] > 127 ? 1 : 0;
const rc = document.createElement("canvas"); rc.width = MW; rc.height = MH;
const rg = rc.getContext("2d", { willReadFrequently: true });
const clone = (o) => JSON.parse(JSON.stringify(o));
const get = (o, p) => p.split(".").reduce((a, k) => a[k], o);
const set = (o, p, v) => { const ks = p.split("."); let a = o; for (const k of ks.slice(0, -1)) { if (a[k] == null) a[k] = /^\d+$/.test(k) ? [] : {}; a = a[k]; } a[ks[ks.length - 1]] = v; };
const base = clone(A.spec);
const specs = A.params || [];
for (const [p] of specs) { let v; try { v = get(base, p); } catch (e) { v = undefined; } if (typeof v !== "number") throw new Error("no numeric base value for " + p); }
const sprite = document.createElement("canvas");
let cacheKey = null, cacheB = null;
function draw(g, spec, res) {
  const key = res + JSON.stringify({ ...spec, xf: null });
  let B;
  if (res === 1 && key === cacheKey) B = { ...cacheB, xf: spec.xf || null };
  else { B = L.lateSprite(spec, { res, canvas: res === 1 ? sprite : null, soft: 0 }); if (res === 1) { cacheKey = key; cacheB = B; } }
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, g.canvas.width, g.canvas.height);
  g.setTransform(g.canvas.width / MW, 0, 0, g.canvas.height / MH, 0, 0); g.translate(0.5 - bx0, 0.5 - by0);
  L.applyXf(g, B);
  if (B.flip) g.transform(-1, 0, 0, 1, 2 * B.hx, 0);
  g.drawImage(B.canvas, B.x, B.y, B.w, B.h); g.restore();
}
function evalS(spec, want) {
  draw(rg, spec, 1);
  const d = rg.getImageData(0, 0, MW, MH).data;
  let inter = 0, uni = 0;
  for (let i = 0; i < M.length; i++) { const r = d[i * 4 + 3] > 127 ? 1 : 0; inter += r & M[i]; uni += r | M[i]; }
  const iou = inter / Math.max(1, uni);
  let pen = 0, lmOut = null;
  if (A.lm) {
    // landmarks of the painter (s21 owl.landmarks) in real local px; the pose as late.js builds it (without legs/wings)
    const BASES = { TOP: P21.TOP, WALK: P21.WALK, FLY: P21.FLY, LOOK: P21.LOOK, CROUCH: P21.CROUCH, FACE: { ...P21.FACE, head: { yaw: 0, nod: 0, roll: 0, r: 95, bump: 6, square: 2.4 }, body: P21.WALK.body, tail: P21.WALK.tail } };
    const pose = O21.over(BASES[spec.base || "WALK"], spec.pose || {});
    const lm = O21.landmarks(pose, { x: spec.head[0], y: spec.head[1], s: spec.s });
    const R = (p) => { let q = spec.flip ? [2 * spec.head[0] - p[0], p[1]] : p; if (spec.xf) { const [dx, dy, rot, k] = spec.xf; const u = [(q[0] - spec.head[0]) * (k || 1), (q[1] - spec.head[1]) * (k || 1)], c = Math.cos(rot || 0), s = Math.sin(rot || 0); q = [spec.head[0] + dx + c * u[0] - s * u[1], spec.head[1] + dy + s * u[0] + c * u[1]]; } return q; };
    lmOut = {};
    for (const [k, tx, ty, w] of A.lm) { const p = R(lm[k]); lmOut[k] = p; pen += (A.lmW ?? 0.002) * w * ((p[0] - tx) ** 2 + (p[1] - ty) ** 2); }
  }
  return want ? { cost: 1 - iou + pen, iou, pen, lm: lmOut } : 1 - iou + pen;
}
function apply(v) { const F = clone(base); specs.forEach(([p, st], i) => set(F, p, get(base, p) + v[i] * st)); return F; }
const n = specs.length, f = (v) => evalS(apply(v));
let bestV = new Array(n).fill(0);
const t0 = performance.now();
if (n) {
  let S = [new Array(n).fill(0)];
  for (let i = 0; i < n; i++) { const v = new Array(n).fill(0); v[i] = 1; S.push(v); }
  let Fv = S.map(f);
  for (let it = 0; it < (A.iters ?? 400); it++) {
    const ord = Fv.map((c, i) => i).sort((a, b) => Fv[a] - Fv[b]); S = ord.map((i) => S[i]); Fv = ord.map((i) => Fv[i]);
    const cen = new Array(n).fill(0); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) cen[j] += S[i][j] / n;
    const pt = (k) => cen.map((c, j) => c + k * (S[n][j] - c));
    const xr = pt(-1), fr = f(xr);
    if (fr < Fv[0]) { const xe = pt(-2), fe = f(xe); if (fe < fr) { S[n] = xe; Fv[n] = fe; } else { S[n] = xr; Fv[n] = fr; } }
    else if (fr < Fv[n - 1]) { S[n] = xr; Fv[n] = fr; }
    else { const xc = pt(0.5), fc = f(xc); if (fc < Fv[n]) { S[n] = xc; Fv[n] = fc; } else { for (let i = 1; i <= n; i++) { S[i] = S[i].map((x, j) => S[0][j] + 0.5 * (x - S[0][j])); Fv[i] = f(S[i]); } } }
  }
  bestV = S[Fv.indexOf(Math.min(...Fv))];
}
const Sb = apply(bestV);
const r0 = evalS(base, true), r1 = evalS(Sb, true);
// overlay: mask red, model green (Z x)
const Z = A.Z ?? 3;
const oc = document.createElement("canvas"); oc.width = MW * Z; oc.height = MH * Z; const og = oc.getContext("2d");
const mcan = document.createElement("canvas"); mcan.width = MW * Z; mcan.height = MH * Z; const mcg = mcan.getContext("2d");
draw(mcg, Sb, Z);
og.fillStyle = "#000"; og.fillRect(0, 0, oc.width, oc.height);
og.imageSmoothingEnabled = false; og.globalAlpha = 0.5; og.drawImage(mc, 0, 0, oc.width, oc.height); og.globalAlpha = 1;
og.globalAlpha = 0.75; og.drawImage(mcan, 0, 0); og.globalAlpha = 1;
const vc = document.createElement("canvas"); vc.width = MW * Z; vc.height = MH * Z; const vg = vc.getContext("2d");
vg.fillStyle = A.bg || "#000"; vg.fillRect(0, 0, vc.width, vc.height);
{ const B = L.lateSprite(Sb, { res: Z }); vg.setTransform(Z, 0, 0, Z, 0, 0); vg.translate(0.5 - bx0, 0.5 - by0); L.applyXf(vg, B); if (B.flip) vg.transform(-1, 0, 0, 1, 2 * B.hx, 0); vg.drawImage(B.canvas, B.x, B.y, B.w, B.h); }
const res = {}; specs.forEach(([p], i) => (res[p] = +(get(Sb, p)).toFixed(3)));
return { json: { box: [bx0, by0, bx1, by1], lm: r1.lm, pen: r1.pen, before: r0.iou, after: r1.iou, ms: performance.now() - t0, params: res, spec: Sb }, images: { [(A.out || "lf") + "_ov"]: oc.toDataURL(), [(A.out || "lf") + "_v"]: vc.toDataURL() } };
