// s18 shot A owl: where it is and which wing drawing it shows, per source frame.
// The source draws the owl as one rigid figure (template-tracked head and body agree within 2 px) carried along a
// path, with a 4-frame wing cycle (level, up, level, down) on the source's own 24-fps content frames.

// Head/body template offsets vs frame 1356, per source frame (template match on the source). [frame, dx, dy]
export const PATH_A = [
  [1331, 1224, -58], [1332, 1097, -43], [1333, 985, -39], [1334, 864, -32], [1335, 755, -21], [1336, 647, -7], [1337, 554, -4],
  [1338, 470, 0], [1339, 400, 4], [1340, 331, 4], [1341, 283, 1], [1342, 241, 4], [1343, 205, 2], [1344, 178, 5], [1345, 155, 2],
  [1346, 137, 4], [1347, 118, 0], [1348, 103, 4], [1349, 87, 1], [1350, 72, 2], [1351, 72, 2], [1352, 56, 1], [1353, 42, 4],
  [1354, 28, 1], [1355, 14, 2], [1356, 0, 0], [1357, -12, 4], [1358, -25, 0], [1359, -37, 3], [1360, -48, 1], [1361, -56, 4],
  [1362, -60, 0], [1363, -58, 4], [1364, -52, 3], [1365, -45, 3], [1366, -35, 1], [1367, -20, 4], [1368, -9, 2], [1369, -1, 2],
  [1370, 10, 0], [1371, 22, 3], [1372, 33, 2], [1373, 40, 2], [1374, 49, 0], [1375, 57, 4], [1376, 57, 4], [1377, 63, 3],
  [1378, 65, 0], [1379, 69, 2], [1380, 72, 4], [1381, 71, 1],
];

// content frame (the source is 24-fps animation with one repeated frame every 25)
export const contentFrame = (f) => f - Math.floor((f - 1) / 25);
export function wingPhase(f) { return ["level", "up", "level", "down"][contentFrame(f) % 4]; }
export function owlAOffset(f) {
  const i = Math.max(0, Math.min(PATH_A.length - 1, f - PATH_A[0][0]));
  return [PATH_A[i][1], PATH_A[i][2]];
}
