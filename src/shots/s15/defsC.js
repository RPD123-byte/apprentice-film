// s15 take C (41.72–41.88) keyed boxes (tracksC.js, seeds picked on 41.80): the lit stack right of the owl (lower box
// through its two floor corners, upper box sitting on it) and the big lit box on the left (its corridor side)
export const DEFS_C = [
  { id: "RL", kind: "front", f: [1043, 1047], p: { tl: ["trC1", 1, 1043, 1047], tr: ["trC1", 2, 1043, 1047], bl: ["trC1", 3, 1043, 1047], br: ["trC1", 4, 1043, 1046] }, d: 0.5, alb: 1.0 },
  { id: "RU", kind: "front", f: [1043, 1047], p: { bl: ["trC1", 5, 1043, 1047], br: ["trC1", 6, 1043, 1047], tl: ["trC1", 7, 1043, 1046] }, y0: "RL", d: 0.5, stack: [0.4], alb: 1.0 },
  { id: "LB", kind: "side", side: -1, f: [1043, 1045], p: { ft: ["trC1", 0, 1043, 1045] }, xs: -0.2, len: 1.4, w: 0.7, stack: [0.4, 0.4], alb: 1.0 },
];
