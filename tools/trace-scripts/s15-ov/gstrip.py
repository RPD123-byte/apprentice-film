# tiles of SOURCE frames (from the extracted exact frames) with a labelled grid in true frame px; optional crop
# usage: gstrip.py T0,T1,... out.jpg [x0 y0 x1 y1] [--w 700] [--step 50]
import cv2, sys, numpy as np
SRC = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src'
a = sys.argv[1:]; opts = {}
pos = []
i = 0
while i < len(a):
    if a[i].startswith('--'): opts[a[i]] = a[i + 1]; i += 2
    else: pos.append(a[i]); i += 1
times = [float(x) for x in pos[0].split(',')]; out = pos[1]
roi = [int(v) for v in pos[2:6]] if len(pos) >= 6 else [0, 0, 2206, 946]
tw = int(opts.get('--w', 700)); step = int(opts.get('--step', 100 if roi[2] - roi[0] > 1200 else 50)); cols = int(opts.get('--cols', 2))
tiles = []
for t in times:
    fi = int(round(t * 25))
    g = cv2.imread(f'{SRC}/f{fi}.png', 0); f = cv2.cvtColor(g, cv2.COLOR_GRAY2BGR)
    x0, y0, x1, y1 = roi; c = f[y0:y1, x0:x1].copy()
    sc = tw / (x1 - x0); c = cv2.resize(c, (tw, int((y1 - y0) * sc)), interpolation=cv2.INTER_AREA)
    for x in range((x0 // step + 1) * step, x1, step):
        X = int((x - x0) * sc); cv2.line(c, (X, 0), (X, c.shape[0]), (0, 0, 255) if x % 500 == 0 else (0, 180, 255), 1); cv2.putText(c, str(x), (X + 2, 12), 0, 0.4, (0, 255, 255), 1)
    for y in range((y0 // step + 1) * step, y1, step):
        Y = int((y - y0) * sc); cv2.line(c, (0, Y), (c.shape[1], Y), (0, 0, 255) if y % 500 == 0 else (0, 180, 255), 1); cv2.putText(c, str(y), (2, Y - 2), 0, 0.4, (0, 255, 255), 1)
    cv2.putText(c, f'{t:.2f}', (c.shape[1] - 70, c.shape[0] - 8), 0, 0.6, (0, 255, 0), 2)
    tiles.append(c)
while len(tiles) % cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out, np.vstack([np.hstack(tiles[i:i + cols]) for i in range(0, len(tiles), cols)]), [cv2.IMWRITE_JPEG_QUALITY, 88])
