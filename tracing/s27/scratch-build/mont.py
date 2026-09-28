import cv2, glob, re, sys, numpy as np
# mont.py dir out.jpg t0 t1 x0 y0 x1 y1 [scale]
d, out = sys.argv[1], sys.argv[2]
t0, t1 = float(sys.argv[3]), float(sys.argv[4])
x0, y0, x1, y1 = map(int, sys.argv[5:9])
sc = float(sys.argv[9]) if len(sys.argv) > 9 else 0.5
fs = sorted(glob.glob(d + '/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1)))
rows = []
for f in fs:
    t = float(re.search(r'at-([\d.]+)s', f).group(1))
    if t < t0 - 1e-6 or t > t1 + 1e-6: continue
    r = cv2.imread(f); s = cv2.imread(f.replace('frame-', 'ref-'))
    a, b = r[y0:y1, x0:x1], s[y0:y1, x0:x1]
    sep = np.full((a.shape[0], 6, 3), (0, 0, 255), np.uint8)
    row = np.hstack([a, sep, b])
    row = cv2.resize(row, None, fx=sc, fy=sc)
    cv2.putText(row, f'{t:.2f}', (6, 22), 0, 0.7, (0, 0, 255), 2)
    rows.append(row)
cv2.imwrite(out, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 88])
print(len(rows))
