# samp.py T 'x,y[,r] x,y ...' -> pre-grade (ungraded estimate) median colour hex per point; caches the ungraded frame
import sys, os, cv2, numpy as np
from lib import src, ungrade
t = float(sys.argv[1]); cache = f'/tmp/s28d-ung-{t:.2f}.png'
cache = os.path.join(os.path.dirname(__file__), f'../s28d-seg/ung-{t:.2f}.png')
if os.path.exists(cache): p = cv2.imread(cache)
else:
    g = cv2.GaussianBlur(src(t).astype(np.float32) / 255, (0, 0), 1.0)
    p = np.clip(ungrade(g, t) * 255 + 0.5, 0, 255).astype(np.uint8); cv2.imwrite(cache, p)
for q in sys.argv[2].split():
    v = [int(float(a)) for a in q.split(',')]; x, y = v[0], v[1]; r = v[2] if len(v) > 2 else 4
    m = np.median(p[max(0, y - r):y + r + 1, max(0, x - r):x + r + 1].reshape(-1, 3), 0)[::-1]
    print(f'{x},{y}: #{int(m[0]):02x}{int(m[1]):02x}{int(m[2]):02x}  {tuple(int(a) for a in m)}')
