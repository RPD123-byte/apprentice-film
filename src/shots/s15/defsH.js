// s15 take H (43.92–44.44) keyed boxes (tracksH.js corner tracks -> keyed.js buildBox); seeds picked on 43.92, 44.12 and
// 44.40 (snapshots/s15-ov/corners.py)
export const DEFS_H = [
  // 43.92–43.96: the lit box right of the owl (its corridor side, the hatched front beyond), the big lit box at the right
  // edge, the lit box front at the left
  { id: "R2", kind: "side", side: 1, f: [1098, 1099], p: { ft: ["trH1", 0, 1098, 1099], fb: ["trH1", 1, 1098, 1099], nt: ["trH1", 2, 1098, 1099], nb: ["trH1", 3, 1098, 1099] }, w: 0.35, stack: [0.42, 0.4], alb: 1.0 },
  { id: "R1", kind: "side", side: 1, f: [1098, 1099], p: { ft: ["trH1", 4, 1098, 1099], fb: ["trH1", 5, 1098, 1098] }, len: 1.2, fixLen: true, w: 0.6, h: 0.45, stack: [0.42, 0.4, 0.4], alb: 1.0 },
  // 44.04–44.24: the box whose lit corridor side and hatched front fill the right half, the lit box on top of it
  { id: "RH", kind: "side", side: 1, f: [1101, 1106], p: { nt: ["trH2", 0, 1101, 1106], ft: ["trH2", 1, 1101, 1106], fb: ["trH2", 2, 1101, 1105], nb: ["trH2", 3, 1101, 1103] }, w: 1.0, len: 0.5, alb: 0.95, stack: [0.45, 0.4] },
  // 44.28–44.40: the box left of the owl (hatched front, lit corridor side), the box on the right (its front)
  { id: "HL", kind: "side", side: -1, f: [1107, 1110], p: { nt: ["trH3", 0, 1107, 1110], ft: ["trH3", 1, 1107, 1110], nb: ["trH3", 2, 1107, 1110] }, w: 0.6, len: 0.3, alb: 1.0 },
  { id: "HR", kind: "front", f: [1107, 1111], p: { tl: ["trH3", 3, 1107, 1111], bl: ["trH3", 4, 1107, 1111] }, square: true, w: 0.7, d: 0.5, stack: [0.4, 0.4], alb: 0.9 },
];
