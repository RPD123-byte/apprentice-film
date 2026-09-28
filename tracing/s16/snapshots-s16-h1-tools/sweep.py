# sweep.py N 'JSON list of room TUNE dicts' ROI  -> sigma-2/4 error in ROI for each setting
import sys, json, cv2, numpy as np; sys.path.insert(0, '.')
from lab import Lab
import h16
n = int(sys.argv[1]); sets = json.loads(sys.argv[2]); roi = [int(v) for v in sys.argv[3].split(',')]
own = json.loads(sys.argv[4]) if len(sys.argv) > 4 else [{}] * len(sets)
L = Lab(); B = h16.gray(h16.src(n))
for s, o in zip(sets, own):
    L.js('(a) => S16H.tune(a[0], a[1])', [s, o])
    A = h16.gray(h16.grade(L.raw(n), n))
    e = h16.errs(A, B, roi, (1, 2, 4, 8))
    x0, y0, x1, y1 = roi
    print(json.dumps(s), json.dumps(o), ' '.join('%.2f' % v for v in e), ' mean %.1f/%.1f' % (A[y0:y1, x0:x1].mean(), B[y0:y1, x0:x1].mean()), flush=True)
L.close()
