#!/usr/bin/env python3
# bellyerr.py owlB.pkl SP [out.jpg] - the shot-B belly drawing against its registered median (registered coords)
import sys, os, pickle, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from inktrace import render_preview
from grade import forward
R = pickle.load(open(sys.argv[1], 'rb')); B = np.load(sys.argv[2] + '/B_body.npy').astype(np.float32)
D = R['belly']; H, W = B.shape
lay, al = render_preview(D, (H, W), soft=0.6, wk=(float(os.environ.get('OWK', 0.85)), 1), alpha=True)
Rr = B * (1 - al) + lay
m = cv2.erode((al > 0.99).astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
g = lambda a: forward(np.clip(a[:946, :2206], 0, 1)) * 255
Rg, Sg = g(Rr), g(B); mm = m[:946, :2206]
fine = lambda a: ((cv2.GaussianBlur(a, (0, 0), 4) - cv2.GaussianBlur(a, (0, 0), 0.7)) > 25)
print(' '.join(f's{k} {np.abs(cv2.GaussianBlur(Rg,(0,0),k)-cv2.GaussianBlur(Sg,(0,0),k))[mm].mean():.2f}' for k in (1, 2, 6)),
      f'mean {Rg[mm].mean():.1f}/{Sg[mm].mean():.1f}', f'fine-dark share {fine(Rg)[mm].mean():.3f}/{fine(Sg)[mm].mean():.3f}')
if len(sys.argv) > 3:
    ys, xs = np.nonzero(mm); x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    im = np.vstack([Rg[y0:y1, x0:x1], Sg[y0:y1, x0:x1]]).clip(0, 255).astype(np.uint8)
    cv2.imwrite(sys.argv[3], cv2.resize(im, None, fx=0.6, fy=0.6, interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 90])
