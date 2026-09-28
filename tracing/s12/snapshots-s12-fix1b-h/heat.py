# heat.py render.png source.png x0 y0 x1 y1 zoom out.jpg [sigma] -> render | source | signed diff heat (blue: render darker)
import cv2, numpy as np, sys
R = cv2.imread(sys.argv[1], 0).astype(np.float32); S = cv2.imread(sys.argv[2], 0).astype(np.float32)
x0, y0, x1, y1 = map(int, sys.argv[3:7]); z = float(sys.argv[7]); sg = float(sys.argv[9]) if len(sys.argv) > 9 else 3
D = cv2.GaussianBlur(R, (0, 0), sg) - cv2.GaussianBlur(S, (0, 0), sg)
d = D[y0:y1, x0:x1]; h = np.zeros(d.shape + (3,), np.uint8)
h[..., 2] = np.clip(d * 4, 0, 255); h[..., 0] = np.clip(-d * 4, 0, 255)
f = lambda a: cv2.resize(a, None, fx=z, fy=z, interpolation=cv2.INTER_NEAREST)
g = lambda a: cv2.cvtColor(a[y0:y1, x0:x1].astype(np.uint8), cv2.COLOR_GRAY2BGR)
cv2.imwrite(sys.argv[8], np.hstack([f(g(R)), f(g(S)), f(h)]), [cv2.IMWRITE_JPEG_QUALITY, 90])
