# pz.py DIR frame x0 y0 x1 y1 scale out.jpg [grid] [--v] : render (DIR/r<f>.png) | source crop, magnified with grid
import cv2, numpy as np, sys
S = '/Users/computer/rootline/apprentice-film/snapshots/s13-w3-src'
d, f = sys.argv[1], sys.argv[2]
x0, y0, x1, y1, sc = map(int, sys.argv[3:8]); out = sys.argv[8]; gs = int(sys.argv[9]) if len(sys.argv) > 9 and sys.argv[9].isdigit() else 20
vert = '--v' in sys.argv
def crop(im):
    c = cv2.resize(im[y0:y1, x0:x1], None, fx=sc, fy=sc, interpolation=cv2.INTER_NEAREST if sc >= 3 else cv2.INTER_LINEAR); c = cv2.cvtColor(c, cv2.COLOR_GRAY2BGR)
    for x in range((x0 // gs + 1) * gs, x1, gs):
        X = (x - x0) * sc; cv2.line(c, (X, 0), (X, c.shape[0]), (0, 120, 200) if x % 100 else (0, 0, 255), 1); cv2.putText(c, str(x), (X + 2, 12), 0, 0.38, (0, 255, 255), 1)
    for y in range((y0 // gs + 1) * gs, y1, gs):
        Y = (y - y0) * sc; cv2.line(c, (0, Y), (c.shape[1], Y), (0, 120, 200) if y % 100 else (0, 0, 255), 1); cv2.putText(c, str(y), (2, Y - 2), 0, 0.38, (0, 255, 255), 1)
    return c
r = cv2.imread(f'{d}/r{f}.png', 0); s = cv2.imread(f'{S}/f{f}.png', 0)
a, b = crop(r), crop(s)
sep = np.full((a.shape[0], 6, 3), (0, 0, 255), np.uint8) if not vert else np.full((6, a.shape[1], 3), (0, 0, 255), np.uint8)
cv2.imwrite(out, np.vstack([a, sep, b]) if vert else np.hstack([a, sep, b]), [cv2.IMWRITE_JPEG_QUALITY, 90]); print(out)
