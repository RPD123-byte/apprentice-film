# zoom.py IMG x0 y0 x1 y1 S out.jpg [IMG2] : zoom with a 10 px grid (bright line every 50 px); IMG2 stacked side by side
import sys, cv2, numpy as np
a = sys.argv; x0, y0, x1, y1 = map(int, a[2:6]); s = int(a[6]); out = a[7]
def z(p):
    c = cv2.imread(p)[y0:y1, x0:x1]; c = cv2.resize(c, None, fx=s, fy=s, interpolation=cv2.INTER_CUBIC)
    for x in range(0, c.shape[1], 10 * s): cv2.line(c, (x, 0), (x, c.shape[0]), (0, 0, 255) if ((x // s + x0) % 50) == 0 else (0, 0, 110), 1)
    for y in range(0, c.shape[0], 10 * s): cv2.line(c, (0, y), (c.shape[1], y), (0, 0, 255) if ((y // s + y0) % 50) == 0 else (0, 0, 110), 1)
    return c
cs = [z(p) for p in [a[1]] + a[8:]]
o = np.hstack([np.hstack([c, np.full((c.shape[0], 6, 3), 255, np.uint8)]) for c in cs]) if cs[0].shape[1] * len(cs) <= 2000 else np.vstack([np.vstack([c, np.full((6, c.shape[1], 3), 255, np.uint8)]) for c in cs])
cv2.imwrite(out, o, [cv2.IMWRITE_JPEG_QUALITY, 90])
