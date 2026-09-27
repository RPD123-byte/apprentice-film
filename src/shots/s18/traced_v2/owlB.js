// s18 shot B owl: the belly track. The body is one rigid drawing moved along this track (template match per source
// frame, vs frame 1382); the far wing, tail, legs and feet are handled in owlBT.js.
// ---------------------------------------------------------------- body track: [frame, dx, dy] vs frame 1382
export const TRACK_B = [
  [1382, 0, 0], [1383, -39, 1], [1384, -64, -3], [1385, -73, -8], [1386, -74, -1], [1387, -76, 4], [1388, -76, 2], [1389, -84, -4],
  [1390, -103, 2], [1391, -120, 2], [1392, -132, -6], [1393, -140, -12], [1394, -141, -3], [1395, -146, 5], [1396, -156, 3],
  [1397, -164, -3], [1398, -182, 7], [1399, -194, 12], [1400, -199, 8], [1401, -199, 8], [1402, -212, -6], [1403, -206, 12],
  [1404, -212, 26], [1405, -212, 30], [1406, -232, 24], [1407, -248, 28], [1408, -312, 24], [1409, -392, 18], [1410, -453, 3],
  [1411, -496, -8], [1412, -540, -21], [1413, -572, -30], [1414, -593, -40], [1415, -585, -29], [1416, -589, -32],
];
export function bodyOffset(f) {
  if (f <= TRACK_B[0][0]) return [0, 0, 0];
  const last = TRACK_B[TRACK_B.length - 1];
  if (f <= last[0]) { const r = TRACK_B[f - TRACK_B[0][0]]; return [r[1], r[2], 0]; }
  return [last[1], last[2], 0];
}
