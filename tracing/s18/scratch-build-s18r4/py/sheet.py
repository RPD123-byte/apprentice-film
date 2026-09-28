# sheet.py renderdir frames(a-b) x0 y0 x1 y1 out.jpg [cols] [tw]: per frame render crop above source crop
import sys, numpy as np, cv2
SRC='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18r4/src/'
d = sys.argv[1]; a, b = map(int, sys.argv[2].split('-')); x0, y0, x1, y1 = map(int, sys.argv[3:7]); out = sys.argv[7]
cols = int(sys.argv[8]) if len(sys.argv) > 8 else 8; tw = int(sys.argv[9]) if len(sys.argv) > 9 else 260
tiles = []
for n in range(a, b + 1):
    R = cv2.imread(f'{d}/r{n}.png'); S = cv2.imread(f'{SRC}f{n:04d}.png')
    r = R[y0:y1, x0:x1] if R is not None else np.zeros((y1-y0, x1-x0, 3), np.uint8); s = S[y0:y1, x0:x1]
    t = np.vstack([r, np.full((3, x1-x0, 3), (0, 0, 255), np.uint8), s])
    th = int(t.shape[0] * tw / t.shape[1]); t = cv2.resize(t, (tw, th), interpolation=cv2.INTER_AREA)
    cv2.putText(t, str(n), (3, 14), 0, 0.45, (0, 255, 255), 1); tiles.append(t)
while len(tiles) % cols: tiles.append(np.zeros_like(tiles[0]))
rows = [np.hstack(tiles[i:i + cols]) for i in range(0, len(tiles), cols)]
cv2.imwrite(out, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 88])
