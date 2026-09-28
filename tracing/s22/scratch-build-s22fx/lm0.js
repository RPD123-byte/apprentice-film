const O = await imp("./src/shots/s22/owl21.js");
const P = await imp("./src/shots/s22/poses21.js");
const pose = { ...P.TOP, wings: [], grip: { ...P.TOP.grip, aim: "lower" } };
const lm = O.landmarks(pose, { x: 409.5, y: 89.9, s: 0.34 });
return { json: lm };
