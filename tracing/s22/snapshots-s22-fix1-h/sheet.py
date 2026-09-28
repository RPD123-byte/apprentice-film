# sheet.py DIR F0 F1 STEP x0 y0 x1 y1 scale out [cols]: tiles of (render over source) crops with frame labels
import sys, cv2, numpy as np
sys.path.insert(0, '.')
from run import src
d = sys.argv[1]; F0, F1, st = [int(v) for v in sys.argv[2:5]]; x0, y0, x1, y1 = [int(v) for v in sys.argv[5:9]]; s = float(sys.argv[9]); out = sys.argv[10]
cols = int(sys.argv[11]) if len(sys.argv) > 11 else 4
tiles = []
for F in range(F0, F1 + 1, st):
    r = cv2.imread(f'{d}/r{F:04d}.png')
    if r is None: continue
    a = r[y0:y1, x0:x1]; b = src(F)[y0:y1, x0:x1]
    t = np.vstack([a, np.full((3, a.shape[1], 3), (0, 0, 200), np.uint8), b])
    t = cv2.resize(t, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
    cv2.putText(t, f'{F} {F/25:.2f}', (4, 14), 0, 0.45, (0, 255, 255), 1)
    tiles.append(np.pad(t, ((2, 2), (2, 2), (0, 0))))
while len(tiles) % cols: tiles.append(np.zeros_like(tiles[0]))
rows = [np.hstack(tiles[i:i + cols]) for i in range(0, len(tiles), cols)]
cv2.imwrite(out, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 85]); print(out, len(tiles))
