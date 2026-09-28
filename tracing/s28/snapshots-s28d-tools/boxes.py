# boxes.py render.png T 'name:x0,y0,x1,y1 ...'  -- median pre-grade colour of source vs render per box, and the delta
import sys, cv2, numpy as np
from lib import src, ungrade
r = cv2.imread(sys.argv[1]).astype(np.float32) / 255; t = float(sys.argv[2])
Ru = ungrade(cv2.GaussianBlur(r, (0, 0), 1.2), t) * 255; Su = ungrade(cv2.GaussianBlur(src(t).astype(np.float32) / 255, (0, 0), 1.2), t) * 255
for q in sys.argv[3].split():
    n, b = q.split(':'); x0, y0, x1, y1 = map(int, b.split(','))
    a = np.median(Ru[y0:y1, x0:x1].reshape(-1, 3), 0)[::-1]; s = np.median(Su[y0:y1, x0:x1].reshape(-1, 3), 0)[::-1]
    am = Ru[y0:y1, x0:x1].reshape(-1, 3).mean(0)[::-1]; sm = Su[y0:y1, x0:x1].reshape(-1, 3).mean(0)[::-1]
    h = lambda c: '#%02x%02x%02x' % tuple(int(np.clip(v, 0, 255)) for v in c)
    print(f'{n:12s} render {h(a)} src {h(s)}  mean-delta(src-render) {(sm - am).round().astype(int)}')
