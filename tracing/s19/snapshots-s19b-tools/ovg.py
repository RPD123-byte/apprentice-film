# ovg.py out.jpg scale step "t:x0,y0,x1,y1" ... : source crop with grid + our owl outline (red)
import sys; sys.path.insert(0, '.')
from lab import *
out = sys.argv[1]; sc = float(sys.argv[2]); step = int(sys.argv[3]); tiles = []
L = Lab()
for spec in sys.argv[4:]:
    t, box = spec.split(':'); t = float(t); x0, y0, x1, y1 = [int(v) for v in box.split(',')]
    o = L.devc('owlc', {'t': t}); m = (o[:, :, 3] > 100).astype(np.uint8)
    f = src(t).copy(); cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); cv2.drawContours(f, cs, -1, (0, 0, 255), 2)
    f = cv2.resize(f[y0:y1, x0:x1], None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA)
    for x in range((x0 // step + 1) * step, x1, step):
        X = int((x - x0) * sc); cv2.line(f, (X, 0), (X, f.shape[0]), (0, 200, 255), 1); cv2.putText(f, str(x), (X + 2, 12), 0, 0.4, (0, 255, 255), 1)
    for y in range((y0 // step + 1) * step, y1, step):
        Y = int((y - y0) * sc); cv2.line(f, (0, Y), (f.shape[1], Y), (0, 200, 255), 1); cv2.putText(f, str(y), (2, Y - 3), 0, 0.4, (0, 255, 255), 1)
    cv2.putText(f, f'{t:.2f}', (f.shape[1] - 60, f.shape[0] - 8), 0, 0.6, (0, 255, 0), 2); tiles.append(f)
L.close()
h = max(t.shape[0] for t in tiles); tiles = [np.vstack([t, np.zeros((h - t.shape[0], t.shape[1], 3), np.uint8)]) for t in tiles]
cv2.imwrite(out, np.hstack(tiles), [cv2.IMWRITE_JPEG_QUALITY, 90])
