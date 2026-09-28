# split.py times : graded blurred error split into owl region (dilated own owl alpha) / card region / rest
import sys; sys.path.insert(0, '.')
from lab import *
import numpy as np, cv2
sys.path.insert(0, '.')
ts = [float(v) for v in sys.argv[1].split(',')]
L = Lab(); tot = []
for t in ts:
    r = cv2.cvtColor(L.render(t), cv2.COLOR_BGR2GRAY).astype(np.float32); s = src(t, True).astype(np.float32)
    o = L.devc('owlc', {'t': t}); a = (o[:, :, 3] > 30).astype(np.uint8) if o.shape[2] == 4 else np.zeros(r.shape, np.uint8)
    a = cv2.dilate(a, np.ones((31, 31), np.uint8)).astype(bool)
    d = np.abs(cv2.GaussianBlur(r, (0, 0), 8) - cv2.GaussianBlur(s, (0, 0), 8))
    rest = ~a
    print(f'{t:.2f} all {d.mean():5.2f}  owl {d[a].mean() if a.any() else 0:5.2f} ({a.mean()*100:4.1f}% -> {d[a].sum()/d.size if a.any() else 0:5.2f})  rest {d[rest].mean():5.2f} (-> {d[rest].sum()/d.size:5.2f})')
L.close()
