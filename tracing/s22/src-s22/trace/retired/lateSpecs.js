// s22: the specs of the owl's drawings after the cut (s22/late.js). Generated from the fitting runs (silhouette IoU
// against the source's owl + measured landmarks and strokes); local px of each drawing. `xf` re-uses a drawing,
// rigidly moved, for a neighbouring pose.
export const LATE_SPECS = {
  walk: {
    base: "WALK",
    flip: true,
    head: [123.043, 51.398],
    s: 0.319,
    pose: { bandage: null, head: { yaw: 0.169, nod: 0, roll: 0, r: 95, sy: 1, bump: 6 }, body: { x: 84.94, y: 135.63, a: 160.979, b: 114.957, rot: 0.838, egg: 0.1 }, tail: { base: [0, 259], tip: [-59.628, 268.537], w: 30, n: 2 }, phones: { cupAz: -0.05, cupEl: -0.1, r: 46, lit: 0.3, bandW: 20, bandTone: 0, bandSq: 1, bandH: 1.2, bandTilt: 0.1 }, tufts: [{ at: -0.36, size: 26, width: 0.3, lean: -0.2 }], eye: { hide: true }, beak: { hide: true }, fringe: false, rim: 0.3, shade: 0.9, headShade: 0.97 },
    wings: [{ px: true, layer: "mid", S: [112, 92], Wr: [85, 96], T: [62, 98], trail: [-0.55, 0.84], len: 22, nP: 5, nS: 3, fan: 0.9, tipX: 0.3, secL: 0.9, seed: 5 }, { px: true, layer: "mid", S: [88, 56], Wr: [62, 58.048], T: [42.126, 51], trail: [-0.3, 0.95], len: 37.314, nP: 7, nS: 5, fan: 0.95, tipX: 0.3, secL: 0.95, seed: 3 }],
    legs: [{ hipPx: [68, 118], foot: [38, 142], far: false }, { hipPx: [112, 125], foot: [115, 145], far: true }],
    soft: 1.2,
    face: [
      { k: "ink", v: 0.08, w: 1.8, pts: [[108.5, 40], [113, 38.4], [117, 37.2], [120.5, 36]] },
      { k: "ink", v: 0.1, w: 1.6, pts: [[110, 42.5], [114, 43.2], [118, 43.8], [122, 45.2]] },
      { k: "ink", v: 0.12, w: 1.6, pts: [[95.5, 36.8], [97.5, 35.6], [99.5, 35.2]] },
      { k: "fill", v: 0.8, pts: [[93, 48], [98, 46.8], [104, 48], [102, 51.5], [97, 52.5], [93.5, 51]] },
      { k: "ink", v: 0.5, a: 0.6, w: 1, pts: [[93.5, 51], [97, 52.5], [102, 51.5]] },
    ],
  },
};
