// measuring aid (not part of the film): fit CUT_FIT to the source's cut-drawing silhouette (cut_mask.png, crop
// origin cup-local (-115, -60), 330 x 172) + landmarks, by Nelder-Mead on the owl sprite's own alpha.
const C = await imp("./src/shots/s22/cut.js");
const A = arg || {};
const DIR = "file:///private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s22fx/";
const img = new Image(); img.src = DIR + (A.mask || "cut_mask.png"); await img.decode();
const MW = img.width, MH = img.height, X0 = A.x0 ?? -115, Y0 = A.y0 ?? -60;
const mc = document.createElement("canvas"); mc.width = MW; mc.height = MH;
const mg = mc.getContext("2d", { willReadFrequently: true }); mg.drawImage(img, 0, 0);
const md = mg.getImageData(0, 0, MW, MH).data, M = new Uint8Array(MW * MH);
let mN = 0; for (let i = 0; i < M.length; i++) { M[i] = md[i * 4] > 127 ? 1 : 0; mN += M[i]; }
const rc = document.createElement("canvas"); rc.width = MW; rc.height = MH;
const rg = rc.getContext("2d", { willReadFrequently: true });
const clone = (o) => JSON.parse(JSON.stringify(o));
const get = (o, p) => p.split(".").reduce((a, k) => a[k], o);
const set = (o, p, v) => { const ks = p.split("."); let a = o; for (const k of ks.slice(0, -1)) { if (a[k] == null) a[k] = {}; a = a[k]; } a[ks[ks.length - 1]] = v; };
let base = clone(A.F || C.CUT_FIT);
const specs = A.params || [];
const PZ = await imp("./src/shots/s22/poses21.js");
const tryGet = (o, p) => { try { const v = get(o, p); return v; } catch (e) { return undefined; } };
for (const [p] of specs) if (tryGet(base, p) === undefined && p.startsWith("pose.")) set(base, p, tryGet(PZ.TOP, p.slice(5)));
for (const [p] of specs) if (tryGet(base, p) === undefined) throw new Error("no base value for " + p);
const sprite = document.createElement("canvas");
function evalF(F, want) {
  const B = C.cutSprite(F, { res: 1, canvas: sprite, soft: 0 });
  rg.setTransform(1, 0, 0, 1, 0, 0); rg.clearRect(0, 0, MW, MH);
  rg.drawImage(B.canvas, B.x - X0 - 0.5, B.y - Y0 - 0.5, B.w, B.h);
  const d = rg.getImageData(0, 0, MW, MH).data;
  let inter = 0, uni = 0;
  for (let i = 0; i < M.length; i++) { const r = d[i * 4 + 3] > 127 ? 1 : 0; inter += r & M[i]; uni += r | M[i]; }
  const iou = inter / Math.max(1, uni);
  let lmE = 0;
  if (A.lm) { const G = C.cutGeometry(F).lm; for (const [k, tx, ty, w] of A.lm) { const p = G[k]; lmE += w * ((p[0] - tx) ** 2 + (p[1] - ty) ** 2); } }
  const cost = 1 - iou + lmE * (A.lmW ?? 0.0005);
  return want ? { cost, iou, lmE, lm: C.cutGeometry(F).lm } : cost;
}
function apply(v) { const F = clone(base); specs.forEach(([p, st], i) => set(F, p, get(base, p) + v[i] * st)); return F; }
const n = specs.length;
const f = (v) => evalF(apply(v));
let best = { v: new Array(n).fill(0) };
const t0 = performance.now();
if (n) {
  // Nelder-Mead
  let S = [new Array(n).fill(0)];
  for (let i = 0; i < n; i++) { const v = new Array(n).fill(0); v[i] = 1; S.push(v); }
  let Fv = S.map(f);
  const iters = A.iters ?? 400;
  for (let it = 0; it < iters; it++) {
    const ord = Fv.map((c, i) => i).sort((a, b) => Fv[a] - Fv[b]); S = ord.map((i) => S[i]); Fv = ord.map((i) => Fv[i]);
    const cen = new Array(n).fill(0); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) cen[j] += S[i][j] / n;
    const pt = (k) => cen.map((c, j) => c + k * (S[n][j] - c));
    const xr = pt(-1), fr = f(xr);
    if (fr < Fv[0]) { const xe = pt(-2), fe = f(xe); if (fe < fr) { S[n] = xe; Fv[n] = fe; } else { S[n] = xr; Fv[n] = fr; } }
    else if (fr < Fv[n - 1]) { S[n] = xr; Fv[n] = fr; }
    else { const xc = pt(0.5), fc = f(xc); if (fc < Fv[n]) { S[n] = xc; Fv[n] = fc; } else { for (let i = 1; i <= n; i++) { S[i] = S[i].map((x, j) => S[0][j] + 0.5 * (x - S[0][j])); Fv[i] = f(S[i]); } } }
  }
  const i0 = Fv.indexOf(Math.min(...Fv)); best.v = S[i0];
}
const Fb = apply(best.v);
const r0 = evalF(base, true), r1 = evalF(Fb, true);
// overlay image: mask (red), model (green), 3x
const B = C.cutSprite(Fb, { res: 3, soft: 0 });
const oc = document.createElement("canvas"); oc.width = MW * 3; oc.height = MH * 3; const og = oc.getContext("2d");
og.fillStyle = "#000"; og.fillRect(0, 0, oc.width, oc.height);
og.globalAlpha = 0.6; og.imageSmoothingEnabled = false; og.drawImage(mc, 0, 0, oc.width, oc.height); og.globalAlpha = 1;
og.setTransform(3, 0, 0, 3, 0, 0); og.globalAlpha = 0.65; og.drawImage(B.canvas, B.x - X0 - 0.5, B.y - Y0 - 0.5, B.w, B.h); og.globalAlpha = 1;
if (A.lm) { og.fillStyle = "#f0f"; for (const [k, tx, ty] of A.lm) { og.fillRect(tx - X0 - 1, ty - Y0 - 1, 2, 2); } og.fillStyle = "#0ff"; for (const [k] of A.lm) { const p = r1.lm[k]; og.fillRect(p[0] - X0 - 1, p[1] - Y0 - 1, 2, 2); } }
const res = {};
specs.forEach(([p], i) => (res[p] = +(get(Fb, p)).toFixed(3)));
return { json: { before: { iou: r0.iou, lmE: r0.lmE }, after: { iou: r1.iou, lmE: r1.lmE }, ms: performance.now() - t0, params: res, lm: r1.lm, F: Fb }, images: { [A.out || "fit"]: oc.toDataURL() } };
