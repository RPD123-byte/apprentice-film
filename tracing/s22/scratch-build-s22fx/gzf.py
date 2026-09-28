import numpy as np, cv2, sys
# gzf.py t x0 y0 x1 y1 Z out  -- graded source frame zoom with frame-coordinate grid (10 px)
fr = np.load('../s22/frames.npy', mmap_mode='r')
t, x0, y0, x1, y1, Z, out = float(sys.argv[1]), *map(int, sys.argv[2:7]), sys.argv[7]
g = np.array(fr[int(round(t * 25)) - 1863]).astype(np.float32).mean(axis=2)
c = np.clip((g[y0:y1, x0:x1] - 30) * 1.15, 0, 255).astype(np.uint8)
im = cv2.cvtColor(cv2.resize(c, None, fx=Z, fy=Z, interpolation=cv2.INTER_CUBIC), cv2.COLOR_GRAY2BGR)
for x in range((x0 // 10 + 1) * 10, x1, 10):
    X = int((x - x0 + 0.5) * Z); cv2.line(im, (X, 0), (X, im.shape[0]), (0, 140, 255) if x % 50 == 0 else (0, 80, 0), 1)
    if x % 50 == 0: cv2.putText(im, str(x), (X + 1, 10), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 220, 255), 1)
for y in range((y0 // 10 + 1) * 10, y1, 10):
    Y = int((y - y0 + 0.5) * Z); cv2.line(im, (0, Y), (im.shape[1], Y), (0, 140, 255) if y % 50 == 0 else (0, 80, 0), 1)
    if y % 50 == 0: cv2.putText(im, str(y), (1, Y - 1), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 220, 255), 1)
cv2.imwrite(out, im)
