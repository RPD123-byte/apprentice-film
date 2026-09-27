// s22 fix pass 1: detail the traced drawings lose, redrawn from measurements (control points, anchor-local
// pixel-index px, pre-grade values; no pixels). Drawn into the sprites by traced.js (`extra`) before their softening.
//
// The cut drawing's face. The traced tone regions leave a soft grey wedge where the source has a scowl: a brow line
// sloping down onto the eye, a crease above it and a dark eye, darkest at its upper right. Geometry measured on the
// bottom-side median of the 41 bottom-side frames (ECC-refined, 8×; the sharpest copy of the drawing), values per
// side: along the bottom (inside the screen) the eye's core reads ~50 /255 on a white of 240; in the margins (top,
// right and left sides) the source's copy is much lighter — core ~150–165, crease ~180–200, brow ~175–190 on ~228.
const grey = (v) => { const c = Math.round(255 * Math.max(0, Math.min(1, v))); return `rgb(${c},${c},${c})`; };
function poly(g, P) { g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.closePath(); }
function line(g, P, w, v) {
  g.lineWidth = w; g.strokeStyle = grey(v); g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.stroke();
}
// the eye's dark mass (boundary of < 100 /255 on the bottom-side median) and a ~1.2 px larger half-tone rim round it
const EYE = [[31.8, 14.8], [37.5, 14.8], [39, 16.8], [40.5, 18.4], [40.8, 20.3], [38.5, 21.2], [36.5, 22.3], [35.3, 23.3], [33.8, 24.6],
  [30.3, 24.6], [28.5, 23.1], [28, 21.5], [29.5, 20], [31, 18.8], [32.6, 17.3], [32.2, 15.8]];
const EYE_RIM = [[31.2, 13.8], [38, 13.9], [40, 16.2], [41.6, 18.1], [41.9, 20.7], [39, 22.2], [37.2, 23.3], [35.8, 24.6], [34, 25.7],
  [30, 25.7], [27.6, 23.8], [26.8, 21.5], [28.6, 19.4], [30.2, 18.1], [31.6, 16.8], [31, 15.4]];
const CORE = { x: 36.6, y: 17.8, rx: 2.6, ry: 1.9, rot: -0.35 };
const BROW_A = [[24.3, 12.3], [26.5, 12.2], [28.5, 12.7]], BROW_B = [[28.5, 12.7], [30.5, 13.5], [32.6, 14.7]];
const CREASE = [[31.7, 2.3], [33, 4.2], [34, 6.2], [34.9, 8.3], [35.5, 10.4], [36, 12.5], [36.3, 14.5]];
const CORNER = [[24.8, 13.8], [24.9, 16.5], [25.2, 19.2], [26.2, 20.8], [27.8, 22.3]];
const TAIL = [[39.5, 20.3], [41.5, 20.8], [43.5, 21.1]];
const LID = [[28.5, 23.9], [31, 25], [33.5, 25.1], [35.2, 24.1]];
// the margin copies' single frames show a dark pupil low in the eye (1870–1896: ~(32, 20.3))
const PUPIL = { x: 32.2, y: 20.3 };
// pre-grade values per copy, tuned against the per-side medians (the traced drawings' values are pre-halation, so
// a dark stroke has to be far darker pre-grade than its graded look). Bottom: eye mean / min 142 / 35 against 143 / 38.
// Margins: the room light added over the owl lifts the eye to ~150–165 by itself, so the margin copy keeps a dark
// eye (lighter mass, a pupil) and thin near-black strokes that survive the lift, as the source's single frames show
// them (1870–1896, 79.24–79.72): eye mean / min 206 / 144 against the median's 209 / 156.
export const FACE_BOT = { rim: 0.3, mass: 0.08, core: 0.02, browA: 0.45, browB: 0.2, crease: 0.5, corner: 0.45, tail: 0.35, lid: 0.4, wA: 1.5, wB: 1.7, wK: 1.4 };
// (fix pass 1, resumed) Checked against SINGLE margin frames (12 frames, top / right / left sides; the medians had
// averaged the boiling wedge into a smaller, lighter eye): the source's margin eye is one soft dark wedge
// (u 26–38, v 13–24) with only a faint crease above it — the long near-black crease read as a "Y" over the eye in
// every frame (crease line 23–48 levels darker than the source's, relative to the white). Crease faint and short,
// the eye's mass darker and its rim wider, the upper brow, corner and lid a little softer: face σ1.5 error
// relative to the white 7.6 / 6.7 / 5.1 → 5.9 / 5.1 / 5.3 (top / right / left).
export const FACE_MARGIN = { rim: 0.3, mass: 0.1, core: 0.1, browA: 0.3, browB: 0, crease: 0.6, creaseLong: false, corner: 0.35, tail: 0.5, lid: 0.4, wA: 1.4, wB: 1.5, wK: 1.4, pupil: 0, pr: 1.7 };
// (drawn over, not inside, the silhouette: the trace left the dark eye as a hole in it)
export function faceExtra(V) {
  return {
    face(g, base) {
      // clear the traced wedge back to the plumage's white round the eye
      g.save(); g.fillStyle = grey(base(32.5, 18.5)); g.beginPath(); g.ellipse(32.8, 18.6, 10.4, 7.6, 0, 0, Math.PI * 2); g.fill(); g.restore();
      poly(g, EYE_RIM); g.fillStyle = grey(V.rim); g.fill();
      poly(g, EYE); g.fillStyle = grey(V.mass); g.fill();
      g.save(); g.fillStyle = grey(V.core); g.beginPath(); g.ellipse(CORE.x, CORE.y, CORE.rx, CORE.ry, CORE.rot, 0, Math.PI * 2); g.fill(); g.restore();
      line(g, BROW_A, V.wA, V.browA); line(g, BROW_B, V.wB, V.browB);
      line(g, V.creaseLong ? CREASE.concat([[37.2, 16.8]]) : CREASE, V.wK, V.crease); line(g, CORNER, 1.2, V.corner); line(g, TAIL, 1.4, V.tail); line(g, LID, 1.2, V.lid);
      if (V.pupil != null) { g.fillStyle = grey(V.pupil); g.beginPath(); g.arc(PUPIL.x, PUPIL.y, V.pr ?? 1.5, 0, Math.PI * 2); g.fill(); }
    },
  };
}
// The cut drawing's parts the trace cut off where they crossed the bright cut line (its silhouette = "brighter than
// the halo round it", which fails over the dashes). Measured per column on every top- and bottom-side frame (50 %
// crossings of σ3 cup-local crops, medians over the 42 / 41 frames; the two sides averaged):
// - the lower blade runs on to a tip at u ≈ 173.5 (ours stopped at ~158) with its lower edge at v 106.2–107.6
//   (ours 102.7, cut flat) and its upper edge (the gap under the upper blade) rising 94.4 → 105.6 over u 144–172;
// - the upper blade's tip reaches u ≈ 188.5 (top side 191, bottom 186; ours ~183), its edges 97.7 / 100.7 at 184;
// - the forward foot (top, right and left sides only — the bottom side's copy has none): toes along the cut line,
//   u −8 … 21, v 99.5–103.8, over the dashes (1870–1900).
const LOWER_BLADE = [[138, 93.4], [144, 94.4], [148, 95.3], [152, 96.9], [156, 98.6], [160, 100.3], [164, 102.1], [168, 104], [172, 105.6], [174, 106.4],
  [172.5, 107.3], [168, 107.6], [162, 107.3], [156, 106.9], [150, 106.4], [144, 106.2], [138, 106]];
const UPPER_TIP = [[178, 95.7], [182, 96.9], [185, 98.2], [187.5, 99.5], [189, 101], [187, 101.5], [184, 101], [181, 100.5], [178, 100]];
const FOOT = [[-9, 99.4], [-4, 99.7], [3, 99.4], [11, 99.4], [17.5, 99.8], [21.2, 101.2], [20, 103.3], [13, 103.6], [4, 103.8], [-4, 104], [-8.8, 103.1]];
const TOE_GAPS = [[[4.2, 100.1], [5.4, 103.5]], [[12.2, 100], [13.2, 103.3]]];
export function edgeAdds(margin) {
  return {
    add(g, base) {
      const white = grey(0.97 * base(160, 100));
      poly(g, LOWER_BLADE); g.fillStyle = white; g.fill();
      poly(g, UPPER_TIP); g.fillStyle = white; g.fill();
      if (margin) {
        poly(g, FOOT); g.fillStyle = grey(0.95 * base(5, 101)); g.fill();
        for (const T of TOE_GAPS) line(g, T, 0.9, 0.45);
      }
    },
  };
}

// The walk's closed eye: the two strokes of s22/lines.js LINES.walk inside the eye box (anchor-local u 105–128,
// v 33–47; their positions agree within ~1 px with single walk frames 2050 / 2060 / 2080), deepened to multiply
// `k` at width `w` (single frames: the strokes read ~100–140 on a white of ~225, ~1.2 px wide).
// (fix pass 2) With the line layers actually showing in the film (s22/traced.js) and drawn after the softening,
// k 0.45 read twice as deep as the source; k 0.7 at 1.2 px matches its single frames: per-column darkest value below
// the white round the eye, raw / σ0.7, upper 28 / 18 against 27 / 18, lower 23 / 14 against 24 / 15 (2050/2060/2080).
export const WALK_EYE = { k: 0.7, w: 1.2 };
export function walkLines(L, o = null) {
  const { k, w } = { ...WALK_EYE, ...(o || {}) };
  return L.map((P) => {
    let inEye = true;
    for (let i = 0; i < P.length; i += 4) if (!(P[i] > 105 && P[i] < 128 && P[i + 1] > 33 && P[i + 1] < 47)) inEye = false;
    if (!inEye) return P;
    const Q = P.slice();
    for (let i = 0; i < Q.length; i += 4) { Q[i + 2] = w; Q[i + 3] = k; }
    return Q;
  });
}

// (fix pass 2) The haul drawing (83.96–84.00, frames 2099–2100). Its trace was cut flat at y 234 (where the card's
// edge crossed it); the source's lower belly, legs and clawed feet go on to y ~256 (x 1536–1624). FEET_8396: that
// outline, the 95-level contour of the two frames' σ0.6 mean (4×, RDP 0.35 px), frame px; drawn below y 232.5 at
// the feet's measured tone (graded median 182 → pre-grade ~0.72, lifted for the softening). CUP_8396: the headphone
// cup, which the trace left as a near-black hole in the silhouette (18–24 against the source's 35–100): its tone
// levels (contours of the same mean at 0 / 45 / 60 / 75 / 90 / 105 inside the cup's ellipse where the render was
// dark), each [pre-grade grey, rings], drawn over the hole; the rim lighter.
const FEET_8396 = [[1535.9,230.4,1536.1,231.6,1541.6,236.1,1547.1,241.9,1548.9,242.4,1551.1,241.6,1550.9,238.4,1552.4,236.1,1557.4,232.9,1567.6,230.4,1568.4,229.1,1568.4,227.9,1569.1,227.6,1573.1,235.6,1573.1,237.4,1571.1,241.4,1566.9,245.1,1564.4,244.9,1559.6,242.1,1555.1,241.1,1553.1,241.4,1552.9,242.4,1556.1,246.6,1552.6,248.1,1551.4,249.4,1551.4,250.6,1552.9,250.9,1555.1,250.1,1556.1,250.9,1557.1,252.9,1558.9,252.9,1561.4,251.9,1568.6,251.9,1572.4,252.9,1574.9,254.1,1576.4,255.6,1577.9,254.6,1577.9,252.1,1573.9,248.4,1573.4,246.1,1575.9,242.1,1579.6,238.1,1583.6,237.9,1595.9,231.9,1598.6,232.4,1602.6,235.1,1603.6,234.9,1604.4,232.9,1611.9,236.9,1614.9,237.9,1617.4,236.1,1621.1,237.6,1623.4,237.6,1623.6,237.1,1622.6,235.4,1617.9,230.9,1614.1,225.6,1562.1,225.6,1562.1,226.4,1557.9,230.1,1550.6,232.4,1549.1,231.9,1547.4,228.1,1544.4,226.9,1543.1,225.6,1538.1,225.6,1539.4,227.1,1539.9,228.9]];
const CUP_8396 = [[0.204,[[1622.6,152.6,1622.6,154.4,1621.6,154.6,1621.6,156.4,1620.6,156.6,1620.6,162.4,1622.6,163.6,1622.6,164.4,1620.6,165.6,1620.6,170.4,1622.6,171.6,1622.6,173.4,1624.4,173.4,1624.6,174.4,1626.4,174.4,1626.6,175.4,1629.4,175.4,1629.6,176.4,1634.4,176.4,1634.6,177.4,1633.6,177.6,1633.6,181.4,1634.4,181.4,1634.6,180.4,1636.4,180.4,1636.6,179.4,1638.4,179.4,1638.4,178.6,1639.4,178.4,1639.4,177.6,1640.4,177.4,1641.6,175.4,1642.4,175.4,1642.4,173.6,1643.4,173.4,1643.4,171.6,1640.6,171.6,1640.4,172.6,1639.4,172.4,1639.4,163.6,1638.4,163.4,1638.4,160.6,1637.6,160.6,1636.4,158.6,1634.6,158.6,1634.4,157.6,1630.6,157.6,1630.4,153.6,1629.6,153.6,1629.4,152.6],[1634.6,145.6,1634.6,147.4,1637.4,147.4,1636.4,145.6]]],[0.261,[[1622.6,152.6,1622.6,154.4,1621.6,154.6,1621.6,156.4,1620.6,156.6,1620.6,162.4,1622.6,163.6,1622.6,164.4,1620.6,165.6,1620.6,170.4,1622.6,171.6,1622.6,173.4,1624.4,173.4,1624.6,174.4,1626.4,174.4,1626.6,175.4,1629.4,175.4,1629.6,176.4,1634.4,176.4,1634.6,177.4,1633.6,177.6,1633.6,181.4,1634.4,181.4,1634.6,180.4,1636.4,180.4,1635.9,179.4,1636.9,177.6,1641.4,173.4,1643.1,172.6,1643.4,171.6,1640.6,171.6,1640.4,172.6,1639.4,172.4,1639.4,163.6,1638.4,163.4,1638.4,160.6,1637.6,160.6,1636.4,158.6,1634.6,158.6,1634.4,157.6,1630.6,157.6,1630.4,153.6,1629.6,153.6,1629.4,152.6],[1622.4,166.9,1623.9,168.9,1623.6,170.4,1621.4,168.6,1621.1,167.6],[1625.1,161.9,1626.9,162.9,1627.1,164.6,1626.1,165.9,1624.4,166.1,1623.4,165.1,1623.4,163.9],[1634.6,145.6,1634.6,147.4,1637.4,147.4,1636.4,145.6]]],[0.321,[[1622.6,152.6,1622.6,154.4,1621.6,154.6,1621.6,156.4,1620.6,156.6,1620.6,162.4,1622.1,157.9,1622.4,155.1,1623.4,153.9,1624.1,154.1,1624.9,156.4,1623.6,158.4,1625.6,158.4,1626.9,159.1,1628.4,163.4,1631.6,162.6,1632.1,163.9,1631.9,167.9,1634.1,172.1,1632.9,172.4,1629.6,169.4,1628.1,166.4,1626.1,167.6,1626.1,169.4,1627.1,171.6,1629.6,172.9,1631.1,174.4,1630.9,174.9,1628.9,174.9,1626.6,172.9,1623.6,172.1,1620.9,168.9,1620.6,165.9,1620.6,170.4,1622.6,171.6,1622.6,173.4,1624.4,173.4,1624.6,174.4,1626.4,174.4,1626.6,175.4,1629.4,175.4,1629.6,176.4,1634.4,176.4,1634.6,177.4,1633.6,177.6,1633.6,181.4,1634.4,181.4,1634.6,180.4,1635.6,180.4,1636.6,176.6,1643.4,171.6,1640.6,171.6,1640.4,172.6,1639.4,172.4,1639.4,163.6,1638.4,163.4,1638.4,160.6,1637.6,160.6,1636.4,158.6,1634.6,158.6,1634.4,157.6,1630.6,157.6,1630.4,153.6,1629.6,153.6,1629.4,152.6],[1634.6,145.6,1634.6,147.4,1637.4,147.4,1636.4,145.6]]],[0.377,[[1620.6,168.4,1620.6,170.4,1622.6,171.6,1622.6,173.4,1624.4,173.4,1624.6,174.4,1626.4,174.4,1626.6,175.4,1629.4,175.4,1629.6,176.4,1634.4,176.4,1634.6,177.4,1633.6,177.6,1633.6,181.4,1634.4,181.4,1635.6,178.1,1635.1,176.1,1628.1,175.1,1626.1,173.6,1623.6,172.9],[1622.4,154.6,1621.6,154.6,1621.6,156.4,1620.6,156.6,1620.6,161.1],[1622.6,152.6,1622.6,154.1,1624.9,152.9,1626.1,153.9,1629.6,154.4,1628.4,158.1,1628.4,161.9,1629.6,162.1,1632.9,158.9,1633.9,159.6,1633.9,166.1,1632.9,168.4,1635.4,171.6,1635.4,173.9,1638.6,173.9,1643.1,171.6,1640.6,171.6,1640.4,172.6,1639.4,172.4,1639.4,163.6,1638.4,163.4,1638.4,160.6,1637.6,160.6,1636.4,158.6,1634.6,158.6,1634.4,157.6,1630.6,157.6,1630.4,153.6,1629.6,153.6,1629.4,152.6]]],[0.428,[[1634.9,176.9,1633.6,177.6,1633.6,181.4,1634.4,181.4,1634.9,180.4],[1636.6,159.6,1635.9,162.4,1636.1,166.9,1634.1,168.9,1637.4,171.6,1639.4,171.9,1639.4,163.6,1638.4,163.4,1638.4,160.6],[1630.4,155.1,1629.4,157.9,1629.6,159.9,1633.4,157.6,1630.6,157.6]]],[0.514,[[1634.6,177.4,1633.6,177.6,1633.6,181.4,1634.4,181.4]]]];
export const CUP_GAIN = 0.74;   // (graded cup mean 75 at 0.8 against the source's 69: halation lifts it)
function ringsFill(g, rings, v) {
  g.beginPath();
  for (const r of rings) { g.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) g.lineTo(r[i], r[i + 1]); g.closePath(); }
  g.fillStyle = grey(v); g.fill("evenodd");
}
export function haulExtra(o = {}) {
  const feetV = o.feetV ?? 0.8, cupGain = o.cupGain ?? CUP_GAIN;
  return {
    add(g) {
      for (const [v, rings] of CUP_8396) ringsFill(g, rings, v * cupGain);
      g.save(); g.beginPath(); g.rect(1500, 232.5, 160, 40); g.clip();
      ringsFill(g, FEET_8396, feetV);
      g.restore();
    },
  };
}
