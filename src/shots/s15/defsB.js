// s15 take B keyed boxes (tracksB.js corner tracks -> keyed.js buildBox)
// B-1 (40.96–41.24): the narrow alley before the whip; seeds picked on 41.16 (snapshots/s15-ov/corners.py)
export const DEFS_B = [
  // the small lit box low on the left, in front: its top edge and the floor corner by the gap
  { id: "LS", kind: "front", f: [1024, 1031], p: { tl: ["trB1", 2, 1024, 1031], tr: ["trB1", 3, 1024, 1031], br: ["trB1", 4, 1024, 1030] }, d: 0.4, square: true, alb: 1.0 },
  // the big lit box behind it (its top-right corner), a little further back
  { id: "LB1", kind: "front", f: [1024, 1031], p: { tr: ["trB1", 0, 1024, 1031] }, zOf: "LS", dz: 0.12, w: 1.4, d: 0.5, alb: 1.0 },
  // the lit box stacked on it (upper left): its right edge
  { id: "LU", kind: "front", f: [1024, 1030], p: { tr: ["trB1", 6, 1024, 1030], br: ["trB1", 7, 1024, 1030] }, y0: "LB1", w: 0.6, d: 0.5, alb: 1.0 },
  // the hatched column at the gap (left): corridor side from its top edge and the far floor contact
  { id: "HC", kind: "side", side: -1, f: [1024, 1031], p: { nt: ["trB1", 9, 1024, 1031], ft: ["trB1", 10, 1024, 1031], fb: ["trB1", 5, 1024, 1030] }, w: 0.5, len: 0.8, alb: 0.6, b: { sideK: 0.9 } },
  // right: the lit box by the gap (front face from its top-left and floor corner), the box next to it, the one above
  { id: "R1", kind: "front", f: [1024, 1031], p: { tl: ["trB1", 11, 1024, 1031], bl: ["trB1", 12, 1024, 1031] }, square: true, w: 0.22, d: 0.5, alb: 1.0 },
  { id: "R2", kind: "front", f: [1024, 1031], p: { tl: ["trB1", 13, 1024, 1031], tr: ["trB1", 14, 1024, 1031] }, zOf: "R1", dz: 0.05, w: 0.4, d: 0.5, alb: 1.0 },
  { id: "RU", kind: "front", f: [1024, 1030], p: { tl: ["trB1", 15, 1024, 1030] }, y0: "R1", zOf: "R1", dz: 0.03, w: 0.7, d: 0.5, alb: 0.9 },
];
// B-2 (41.28–41.64): the alley bends; seeds picked on 41.44: two lit boxes on the left (corridor sides), a stack on the
// right (corridor side), the keyboard leaning in the gap ahead (static, placed at 41.60)
export const DEFS_B2 = [
  { id: "L2", kind: "side", side: -1, f: [1032, 1040], p: { ft: ["trB2", 2, 1032, 1040], fb: ["trB2", 3, 1032, 1039] }, len: 0.6, w: 0.6, stack: [0.4, 0.4], alb: 1.0 },
  { id: "LN", kind: "side", side: -1, f: [1034, 1039], p: { ft: ["trB2", 0, 1035, 1039] }, xsOf: "L2", len: 1.6, fixLen: true, w: 0.6, alb: 1.0 },
  { id: "LNu", kind: "side", side: -1, f: [1034, 1039], p: { ft: ["trB2", 1, 1033, 1036] }, y0: "LN", xsOf: "L2", len: 1.6, fixLen: true, w: 0.6, h: 0.45, stack: [0.4], alb: 1.0 },
  { id: "RS", kind: "side", side: 1, f: [1032, 1041], p: { ft: ["trB2", 4, 1032, 1040], fb: ["trB2", 5, 1033, 1038], nt: ["trB2", 6, 1032, 1040], nb: ["trB2", 7, 1034, 1038] }, w: 0.6, stack: [0.42, 0.4], alb: 1.0 },
];
