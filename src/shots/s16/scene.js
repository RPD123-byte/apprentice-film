// s16 scene: the room plate (./room.js) plus his irises (./eyes.js), and the small API s15 borrows for its fade-up
// into this shot: paintScene(P) (puts the finished room on the plate's overlay) and drawEyes(g) (irises looking right,
// as on the steady frames before his eyes move).
import { roomCanvas, releaseRoom, M } from "./room.js";
import { drawIrises, releaseEyes } from "./eyes.js";
export { M };

export function plateCanvas() { return roomCanvas(); }
export { drawIrises };

export function paintScene(P) {
  P.o.save();
  P.o.drawImage(roomCanvas(), -M, -M);
  P.o.restore();
}
export function drawEyes(g) { drawIrises(g, 1153); }

export function releaseScene() { releaseRoom(); releaseEyes(); }
