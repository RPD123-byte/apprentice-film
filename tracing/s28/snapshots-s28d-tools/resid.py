# resid.py render.png T out.jpg [sigma] -- ungraded (source - render) residual, low-passed: where the source is
# brighter (red) / darker (blue) / warmer (yellow tint) than the render, with a 100 px grid
import sys, cv2, numpy as np
from lib import src, ungrade
r = cv2.imread(sys.argv[1]).astype(np.float32) / 255; t = float(sys.argv[2]); s = float(sys.argv[4]) if len(sys.argv) > 4 else 10
Ru = ungrade(cv2.GaussianBlur(r, (0, 0), 1), t); Su = ungrade(cv2.GaussianBlur(src(t).astype(np.float32) / 255, (0, 0), 1), t)
d = cv2.GaussianBlur(Su - Ru, (0, 0), s) * 255
L = d.mean(2)
v = np.clip(L / 30, -1, 1)
im = np.zeros(r.shape, np.float32)
im[..., 2] = np.clip(v, 0, 1) * 255; im[..., 0] = np.clip(-v, 0, 1) * 255
im[..., 1] = np.clip((d[..., 2] - d[..., 0]) / 30, 0, 1) * 200
g = cv2.cvtColor(cv2.cvtColor(src(t), cv2.COLOR_BGR2GRAY), cv2.COLOR_GRAY2BGR).astype(np.float32)
o = np.clip(g * 0.3 + im * 0.9, 0, 255).astype(np.uint8)
for x in range(0, 2206, 100): cv2.line(o, (x, 0), (x, 946), (90, 90, 90), 1); cv2.putText(o, str(x), (x + 2, 16), 0, 0.5, (255, 255, 255), 1)
for y in range(0, 946, 100): cv2.line(o, (0, y), (2206, y), (90, 90, 90), 1); cv2.putText(o, str(y), (2, y - 3), 0, 0.5, (255, 255, 255), 1)
cv2.imwrite(sys.argv[3], cv2.resize(o, None, fx=0.62, fy=0.62))
