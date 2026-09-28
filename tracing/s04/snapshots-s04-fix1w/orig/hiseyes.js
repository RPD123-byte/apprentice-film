// s04: his irises on the hold key (20.56) as authored shapes -- the tracer broke them into a flat grey disc with a
// stray tick. Measured on the hold frame (snapshots/s04-k2/tr/hiseyes.py): the eye's opening (outline of the sclera +
// iris, the lids excluded), the pupil (darkest compact blob), the iris radius (concentric with the pupil, from its
// boundary with the sclera at the pupil's rows) and the iris value. Drawn into the key canvas, so the key's measured
// flow carries them (19.60-20.88, where he holds his stare at the owl).
import { hash } from "../../lib/rng.js";
const EYES = {"L":{"open":[[815,300],[815,365],[816,366],[829,369],[836,369],[841,371],[858,371],[866,369],[874,369],[890,364],[902,358],[911,356],[914,353],[914,351],[907,351],[906,352],[903,351],[913,341],[912,338],[913,334],[909,331],[910,329],[912,329],[912,327],[909,325],[907,319],[903,315],[899,315],[897,313],[893,313],[891,311],[885,311],[882,312],[879,315],[872,315],[870,313],[871,311],[881,305],[891,303],[891,300]],"pupil":[894.8,333.9,5.3],"r":37.4,"v":159},"R":{"open":[[1175,310],[1175,343],[1185,346],[1192,350],[1187,351],[1177,347],[1175,347],[1175,350],[1180,353],[1197,357],[1205,361],[1255,361],[1260,358],[1264,358],[1267,356],[1273,355],[1277,352],[1283,350],[1296,340],[1301,339],[1301,337],[1309,330],[1309,314],[1304,312],[1299,308],[1291,299],[1288,299],[1288,301],[1292,305],[1294,311],[1296,313],[1298,327],[1300,327],[1302,323],[1302,319],[1304,316],[1307,320],[1307,322],[1291,339],[1267,353],[1253,357],[1248,357],[1247,358],[1213,357],[1205,355],[1204,354],[1205,353],[1216,354],[1217,355],[1226,355],[1227,356],[1251,353],[1251,351],[1246,348],[1240,339],[1238,330],[1238,325],[1239,324],[1248,327],[1250,329],[1249,339],[1251,340],[1251,342],[1255,341],[1258,344],[1261,343],[1265,346],[1272,346],[1274,344],[1278,343],[1279,340],[1282,337],[1285,337],[1288,333],[1287,330],[1288,329],[1288,324],[1290,320],[1293,318],[1292,312],[1289,313],[1281,306],[1280,302],[1272,302],[1269,299],[1267,299],[1264,302],[1259,301],[1252,307],[1248,307],[1246,304],[1253,297],[1260,294],[1267,293],[1267,291],[1265,290],[1209,290],[1193,298],[1187,299]],"pupil":[1271.6,323.2,4.9],"r":34.8,"v":173}};
// b1 pass: the whole eye re-drawn over the hold key, measured on the 20.56 frame at 6-8x (snapshots/s04-b1/g-eLw.jpg,
// g-eRw.jpg, g-eL.jpg, g-eR.jpg): the opening (sclera) with the upper lid's soft shadow, the iris -- a light disc (paint
// ~185 inside) darkening to ~60 at its rim, shaded under the lid, a white corneal wedge cutting its upper-left edge,
// dark streaks in its lower half, the pupil (no separate catchlight) -- then the heavy upper lid line and the lower lid
// line as tapered strokes. (The traced lines there broke into jagged rings.)
const EYE2 = {
  L: {
    open: [[774, 323], [785, 311], [800, 304], [820, 299], [845, 297], [868, 299], [890, 303], [908, 310], [922, 319], [933, 331], [941, 343],
      [930, 346], [912, 350], [890, 354], [865, 354], [840, 353], [815, 349], [797, 341], [783, 331]],
    upper: [[768, 322, 3.9], [780, 309, 5.2], [795, 300, 6.5], [815, 294, 7.2], [840, 291, 7.8], [865, 292, 9.1], [888, 297, 10.4], [905, 303, 11.7], [920, 312, 10.4], [933, 324, 7.8], [944, 340, 5.2]],
    lower: [[776, 333, 2], [794, 348, 2.6], [815, 358, 3], [845, 362, 3], [875, 362, 3], [900, 358, 3], [922, 352, 2.5], [940, 345, 1.8]],
    iris: { c: [890, 334], r: 30, pupil: [894, 333, 5.6, 6.4], wedge: [[855, 334], [879, 334], [878, 322], [880, 311], [872, 304], [855, 304]] },
    corner: [[916, 314], [924, 322], [934, 333], [944, 343], [930, 349], [918, 347], [915, 330]],
  },
  R: {
    open: [[1165, 334], [1178, 312], [1195, 298], [1220, 292], [1250, 292], [1275, 295], [1293, 302], [1308, 313], [1316, 322],
      [1300, 331], [1278, 341], [1250, 347], [1220, 348], [1192, 345], [1170, 338]],
    upper: [[1158, 334, 3.9], [1170, 312, 6.5], [1188, 297, 7.8], [1215, 289, 8.5], [1250, 288, 8.5], [1278, 291, 7.8], [1297, 299, 6.5], [1310, 309, 5.2], [1320, 322, 3.9]],
    lower: [[1164, 343, 2], [1190, 352, 2.6], [1220, 355, 3], [1250, 354, 3], [1276, 348, 3], [1300, 335, 2.5], [1318, 321, 1.8]],
    iris: { c: [1269, 326], r: 31, pupil: [1272, 324, 5.6, 6.8], wedge: [[1234, 323], [1252, 323], [1251, 312], [1252, 300], [1246, 293], [1234, 293]] },
    corner: [[1297, 303], [1306, 309], [1317, 322], [1310, 334], [1298, 345], [1295, 324]],
  },
};
const grey = (v) => { const c = Math.max(0, Math.min(255, Math.round(v))); return `rgb(${c},${c},${c})`; };
// a tapered stroke through [x, y, width] points (Catmull-Rom resampled)
function taperStroke(g, P, fill) {
  const pts = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let k = 0; k < 8; k++) {
      const t = k / 8, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), p1[2] + (p2[2] - p1[2]) * t]);
    }
  }
  pts.push(P[P.length - 1]);
  const n = pts.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const e = Math.min(1, i / 3, (n - 1 - i) / 3), w = pts[i][2] * (0.3 + 0.7 * e) / 2;
    L.push([pts[i][0] - dy * w, pts[i][1] + dx * w]); R.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  g.beginPath(); L.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); for (let i = n - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
  g.closePath(); g.fillStyle = fill; g.fill();
}
// track: the key frame's eye placement (s04/eyetrack.js: { L: { A: [a, b, tx, c, d, ty], p: [pupil x, y] }, R }), or
// null for the 20.56 frame itself. The eye model (measured on 20.56) is drawn under the eye region's affine A; the iris
// and pupil under the same linear part, moved so the model pupil lands on the pupil measured on that frame.
export function paintHisEyes(g, M, tshift = 0, track = null, full = true) {
  let seed = 11;
  for (const k of ["L", "R"]) {
    const E = EYE2[k], I = E.iris, [cx, cy] = I.c, r = I.r, [px, py, prx, pry] = I.pupil, T = 0;   // absolute paint values (measured)
    const tr = track && track[k];
    const A = tr ? tr.A : [1, 0, 0, 0, 1, 0];
    const [a, b, tx, c, d, ty] = A;
    // where the model pupil goes: the measured pupil (or, when none was found, where the eye region's affine puts it)
    const pp = tr && tr.p ? tr.p : [a * px + b * py + tx, c * px + d * py + ty];
    const eyeT = () => g.setTransform(a, c, b, d, tx + M + 0.5, ty + M + 0.5);
    const irisT = () => g.setTransform(a, c, b, d, pp[0] - (a * px + b * py) + M + 0.5, pp[1] - (c * px + d * py) + M + 0.5);
    g.save(); eyeT();
    const openPath = () => { g.beginPath(); E.open.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
    g.save(); openPath(); g.clip();
    // sclera, with the upper lid's soft shadow (full); or only a clean rim round the iris (the traced lids stay)
    if (!full) { irisT(); g.beginPath(); g.arc(cx, cy, r + 3.5, 0, Math.PI * 2); g.fillStyle = grey(244); g.fill(); eyeT(); }
    if (full) { const bot = Math.max(...E.open.map((p) => p[1])), tp = Math.min(...E.open.map((p) => p[1]));
      const vg = g.createLinearGradient(0, tp, 0, bot); vg.addColorStop(0, grey(247)); vg.addColorStop(0.6, grey(246)); vg.addColorStop(1, grey(234));
      openPath(); g.fillStyle = vg; g.fill(); }
    const top = Math.min(...E.open.map((p) => p[1]));
    const sg = g.createLinearGradient(0, top, 0, top + 22);
    sg.addColorStop(0, "rgba(0,0,0,0.05)"); sg.addColorStop(1, "rgba(0,0,0,0)");
    if (full) { openPath(); g.fillStyle = sg; g.fill(); }
    // iris (in its own placement; the opening's clip stays)
    irisT();
    const disc = () => { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); };
    const rg = g.createRadialGradient(px, py, 0, cx, cy, r);
    rg.addColorStop(0, grey(186)); rg.addColorStop(0.4, grey(180)); rg.addColorStop(0.6, grey(150));
    rg.addColorStop(0.8, grey(120)); rg.addColorStop(0.93, grey(95)); rg.addColorStop(1, grey(60));
    disc(); g.fillStyle = rg; g.fill();
    const lg = g.createLinearGradient(0, cy - r, 0, cy + r * 0.1);
    lg.addColorStop(0, "rgba(0,0,0,0.3)"); lg.addColorStop(0.3, "rgba(0,0,0,0.08)"); lg.addColorStop(1, "rgba(0,0,0,0)");
    disc(); g.fillStyle = lg; g.fill();
    // measured: the iris is darker to its lower left and lighter to its right
    const dg = g.createLinearGradient(cx - r * 0.75, cy + r * 0.65, cx + r * 0.35, cy - r * 0.1);
    dg.addColorStop(0, "rgba(0,0,0,0.5)"); dg.addColorStop(1, "rgba(0,0,0,0)");
    disc(); g.fillStyle = dg; g.fill();
    const hg = g.createLinearGradient(cx + r, cy - r * 0.1, cx + r * 0.2, cy);
    hg.addColorStop(0, "rgba(255,255,255,0.25)"); hg.addColorStop(1, "rgba(255,255,255,0)");
    disc(); g.fillStyle = hg; g.fill();
    g.save(); disc(); g.clip();
    for (let q = 0; q < 26; q++) {
      const an = Math.PI * (0.02 + 0.96 * (q / 25)) + (hash(q, seed) - 0.5) * 0.1, r0 = r * (0.38 + 0.12 * hash(q, seed + 1)), r1 = r * (0.7 + 0.2 * hash(q, seed + 2));
      g.strokeStyle = grey(70 + 40 * hash(q, seed + 3) + T); g.globalAlpha = 0.55; g.lineWidth = 1.1 + 0.9 * hash(q, seed + 4);
      g.beginPath(); g.moveTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0); g.lineTo(cx + Math.cos(an) * r1, cy + Math.sin(an) * r1); g.stroke();
    }
    g.globalAlpha = 1;
    // the dark outer ring of the iris
    g.lineWidth = 2; g.strokeStyle = grey(44); disc(); g.stroke();
    // the corneal light: a soft-edged pale wedge
    g.filter = "blur(1.2px)";
    g.beginPath(); I.wedge.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    g.fillStyle = grey(228); g.fill(); g.filter = "none";
    g.restore();
    g.fillStyle = grey(14); g.beginPath(); g.ellipse(px, py, prx, pry, 0, 0, Math.PI * 2); g.fill();
    g.restore();
    eyeT();
    if (!full) { g.restore(); seed += 7; continue; }
    // the waterline: a pale band between the eye's lower edge (the second half of the opening, right to left) and the
    // lower lid line (left to right)
    { const lo = E.lower, edge = E.open.slice(Math.ceil(E.open.length / 2));
      g.beginPath(); lo.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); edge.forEach(([x, y]) => g.lineTo(x, y)); g.closePath();
      g.fillStyle = grey(238); g.fill();
      // the eyeball's lower rim: a thin dark line along the lower edge of the opening
      taperStroke(g, edge.map(([x, y]) => [x, y, 2.6]), grey(62)); }
    // the dark inner corner of the lids
    if (E.corner) { g.filter = "blur(1.5px)"; g.beginPath(); E.corner.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = grey(105); g.fill(); g.filter = "none"; }
    // the lid lines
    taperStroke(g, E.upper, grey(16));
    taperStroke(g, E.lower, grey(40 + T * 0.5));
    g.restore();
    seed += 7;
  }
}
