# diffmap.py DIR IDX out.jpg [sigma]: blurred render | blurred source | signed diff (red = render brighter), 1/2 scale
import cv2, sys, glob, numpy as np
d, idx, out = sys.argv[1], sys.argv[2], sys.argv[3]
sg = float(sys.argv[4]) if len(sys.argv) > 4 else 10
a = cv2.imread(glob.glob(f'{d}/frame-{idx}-*.png')[0], 0).astype(np.float32); b = cv2.imread(glob.glob(f'{d}/ref-{idx}-*.png')[0], 0).astype(np.float32)
A = cv2.GaussianBlur(a, (0, 0), sg); B = cv2.GaussianBlur(b, (0, 0), sg)
D = A - B
vis = np.zeros(a.shape + (3,), np.uint8)
vis[..., 2] = np.clip(D * 3, 0, 255); vis[..., 0] = np.clip(-D * 3, 0, 255); vis[..., 1] = np.clip(B * 0.3, 0, 255)
for y in range(0, a.shape[0], 100): cv2.line(vis, (0, y), (a.shape[1], y), (80, 80, 80), 1); cv2.putText(vis, str(y), (2, y + 14), 0, 0.5, (200, 200, 200), 1)
for x in range(0, a.shape[1], 100): cv2.line(vis, (x, 0), (x, a.shape[0]), (80, 80, 80), 1); cv2.putText(vis, str(x), (x + 2, 14), 0, 0.5, (200, 200, 200), 1)
top = np.hstack([cv2.cvtColor(A.astype(np.uint8), cv2.COLOR_GRAY2BGR), cv2.cvtColor(B.astype(np.uint8), cv2.COLOR_GRAY2BGR)])
top = cv2.resize(top, None, fx=0.5, fy=0.5)
vis = cv2.resize(vis, None, fx=0.5, fy=0.5)
vis = cv2.copyMakeBorder(vis, 0, 0, 0, top.shape[1] - vis.shape[1], cv2.BORDER_CONSTANT)
cv2.imwrite(out, np.vstack([top, vis]), [cv2.IMWRITE_JPEG_QUALITY, 88])
print('mean abs diff', np.abs(D).mean())
