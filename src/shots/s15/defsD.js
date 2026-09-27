// s15 take D (41.96–42.64) keyed boxes (tracksD.js corner tracks -> keyed.js buildBox); seeds picked on 42.20, 42.48
// and 42.60 (snapshots/s15-ov/corners.py), each track used only over the frames where its crops stay on the corner
export const DEFS_D = [
  // 41.96–42.08: the big lit box close on the right (its corridor side), the two lit box fronts on the left
  { id: "RB0", kind: "side", side: 1, f: [1049, 1052], p: { fb: ["trD6", 0, 1049, 1052], ft: ["trD6", 1, 1049, 1050] }, len: 1.6, fixLen: true, w: 0.8, h: 0.41, stack: [0.42, 0.4, 0.4], alb: 1.0 },
  { id: "L0", kind: "front", f: [1049, 1051], p: { tr: ["trD6", 2, 1049, 1051], br: ["trD6", 3, 1049, 1051] }, square: true, w: 0.8, d: 0.5, stack: [0.38, 0.38], alb: 1.0 },
  { id: "L0b", kind: "front", f: [1049, 1051], p: { tl: ["trD6", 4, 1049, 1051], tr: ["trD6", 5, 1049, 1051], br: ["trD6", 6, 1049, 1051] }, square: true, w: 0.3, d: 0.5, alb: 1.0 },
  // 42.04–42.28: the box right of the alley (lit corridor side, hatched front) and the box on top of it
  { id: "RC", kind: "side", side: 1, f: [1051, 1057], p: { nt: ["trD3", 0, 1051, 1057], ft: ["trD3", 1, 1051, 1057], fb: ["trD3", 2, 1051, 1057], nb: ["trD3", 3, 1051, 1056] }, w: 0.7, alb: 0.9 },
  { id: "RCu", kind: "front", f: [1051, 1057], p: { tl: ["trD3", 4, 1051, 1056], bl: ["trD3", 5, 1051, 1057] }, y0: "RC", zOf: "RC", dz: 0.04, w: 0.7, square: true, d: 0.5, alb: 0.9 },
  // 42.36–42.52: the near box on the right (its front), the box above it
  { id: "RN", kind: "front", f: [1058, 1063], p: { tl: ["trD4", 0, 1059, 1063], bl: ["trD4", 1, 1058, 1063], tr: ["trD4", 2, 1060, 1063] }, square: true, w: 0.8, d: 0.6, alb: 0.95 },
  { id: "RNu", kind: "front", f: [1059, 1063], p: { bl: ["trD4", 3, 1059, 1063], tl: ["trD4", 4, 1059, 1063] }, y0: "RN", zOf: "RN", dz: 0.08, w: 0.8, square: true, d: 0.5, alb: 0.8 },
  // 42.36–42.60: the lit column left of the owl (the corridor sides of two stacked boxes)
  { id: "LS", kind: "side", side: -1, f: [1059, 1065], p: { nb: ["trD4", 5, 1060, 1064], nt: ["trD4", 7, 1059, 1065], ft: ["trD4", 8, 1059, 1065] }, len: 0.8, w: 0.6, alb: 1.0 },
  { id: "LSu", kind: "side", side: -1, f: [1059, 1064], p: { nt: ["trD4", 10, 1058, 1064], ft: ["trD4", 9, 1058, 1065] }, y0: "LS", xsOf: "LS", len: 0.8, w: 0.6, alb: 1.0 },
  // 42.56–42.64: the big lit boxes on the left (corridor sides), the lit box on the right
  { id: "LA", kind: "side", side: -1, f: [1064, 1066], p: { nt: ["trD5", 0, 1062, 1066], ft: ["trD5", 1, 1063, 1066], fb: ["trD5", 2, 1064, 1066], nb: ["trD5", 3, 1064, 1066] }, w: 0.6, alb: 1.0 },
  { id: "LAu", kind: "side", side: -1, f: [1064, 1066], p: { nt: ["trD5", 4, 1064, 1065], ft: ["trD5", 5, 1062, 1066] }, y0: "LA", xsOf: "LA", len: 0.9, w: 0.6, alb: 1.0 },
  { id: "RR", kind: "side", side: 1, f: [1064, 1066], p: { ft: ["trD5", 9, 1064, 1066], fb: ["trD5", 10, 1064, 1066] }, len: 1.5, w: 0.6, alb: 1.0 },
];
