export const CUT_FIT = {
  cup: [0, 0],
  // head centre (cup-local px) and scale (frame px per s21 unit), fitted by silhouette IoU + landmarks
  head: [18.928, 6.598],
  s: 0.353,
  // over s21's TOP (s21 units): head, headphones, body, tail, the grip fan; the eye and beak are drawn in `face`
  pose: { bandage: null, head: { r: 95.239, nod: 0.362, yaw: 1.172, roll: 0.146 }, phones: { cupAz: -0.351, cupEl: -0.054, r: 46.799, bandH: 1.188, lit: 0.3, bandW: 22, bandTone: 0 }, eye: { az: 0.323, el: 0.03, hide: true }, body: { x: -70.865, y: 114.601, a: 169.721, b: 124.935, rot: 2.721 }, tail: { base: [-204.03, 160.351], tip: [-326.66, 195.421], w: 35.234, n: 3, fan: 0.05 }, grip: { S: [-97.009, 60.109], A: [129.599, 162.918], B: [-119.876, 216.109], sag: 43.137, topLine: false, sepV: 0.55, sepW: 0.8 }, tufts: [{ at: -0.36, size: 30, width: 0.3, lean: -0.2 }], beak: { hide: true }, fringe: false, rim: 0.5 },
  // the scissors: pivot screw (cup-local px), blade direction, length, opening
  sc: { x: 105.538, y: 80.16, ang: 0.333, L: 87.342, open: 0.153 },
  // feet x on the line (cup-local px) and the hips (s21 units)
  feet: [-70.929, 1.347],
  line: 103.5,
  hips: [[-182.089, 209.457], [-79.638, 226.069]],
  soft: 1.2,
  // finger rings, cup-local px: centre, centre-line semi-axes, thickness, frame angle of the major axis
  rings: [{ c: [48.5, 81.5], rx: 20, ry: 10.5, t: 5.5, rot: 0.12 }, { c: [67.5, 46], rx: 14.5, ry: 12, t: 3.8, rot: 0.55 }],
  // measured details over the head (cup-local px): the far wing's hand behind the upper ring, the face-disc line, the eye (a dark almond, a white crescent at its upper back, the lid), the brow ridge, the beak
  face: [
    { k: "fill", v: 0.64, pts: [[29, 38], [35, 34.5], [43, 35], [50, 39], [53, 46], [52, 55], [47, 61], [39, 62.5], [32, 59], [28, 52], [27.5, 44]] },
    { k: "ink", v: 0.3, a: 0.85, w: 1.6, pts: [[31, 39], [28.2, 45], [28.5, 53], [32.5, 59.5], [39, 62.5]] },
    { k: "ink", v: 0.5, a: 0.7, w: 1.1, pts: [[-6, 19], [-4, 27], [0, 34], [8, 41], [17, 46], [26, 49]] },
    { k: "fill", v: 0.06, pts: [[23.92, 14.46], [26.16, 12.22], [30.64, 12.0], [36.24, 13.9], [41.28, 17.82], [44.64, 21.52], [41.84, 24.32], [36.8, 26.56], [30.64, 26.56], [26.16, 24.76], [24.26, 20.06]] },
    { k: "fill", v: 0.82, pts: [[25.38, 15.02], [27.84, 13.34], [31.76, 13.34], [35.12, 14.8], [36.8, 16.48], [32.88, 17.04], [28.96, 17.6], [26.16, 18.38]] },
    { k: "ink", v: 0.03, w: 1.8, end: 0.3, pts: [[23.92, 13.9], [27.28, 11.77], [31.76, 11.77], [36.8, 13.56], [41.28, 17.37], [44.98, 21.63]] },
    { k: "ink", v: 0.5, a: 0.7, w: 1.4, pts: [[17, 1.2], [24, 0], [30, 1.5], [34.5, 5.5], [37.5, 10.5], [40, 15.5]] },
    { k: "ink", v: 0.75, a: 0.6, w: 1.5, pts: [[34, -10], [41, -8.5], [47, -3], [51, 6]] },
    { k: "ink", v: 0.62, a: 0.5, w: 1.0, pts: [[29, 28.6], [35, 29.6], [41, 28.4]] },
    { k: "fill", v: 0.78, pts: [[34.5, 25.5], [40, 24.5], [45.5, 26], [46.5, 31], [45.5, 35.5], [43.8, 38.5], [41, 36], [37.5, 32], [35, 28.5]] },
    { k: "ink", v: 0.45, a: 0.7, w: 1.3, pts: [[35, 27], [37.5, 32.5], [41.5, 36.5], [44, 38.6]] },
    { k: "ink", v: 0.2, w: 1.2, pts: [[46.3, 31.5], [45.6, 35.5], [43.9, 38.6]] },
  ],
  // feather separations of the near wing, over everything
  top: [
    { k: "ink", v: 0.42, a: 0.75, w: 1.3, pts: [[-34, 45], [-31, 55], [-27, 64], [-21, 72], [-14, 80], [-10, 87]] },
    { k: "ink", v: 0.42, a: 0.75, w: 1.3, pts: [[-25, 48], [-19, 58], [-10, 66], [0, 72], [10, 78], [18, 83]] },
    { k: "ink", v: 0.4, a: 0.75, w: 1.3, pts: [[-8, 58], [5, 65], [18, 70], [30, 73], [43, 75]] },
  ],
};
