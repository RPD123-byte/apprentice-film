#!/usr/bin/env python3
# owlerr.py owl.pkl owlphase.npz phase [out.jpg] - drawing vs its registered median, inside the silhouette (graded)
import sys, os, pickle, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from inktrace import render_preview
from grade import forward
D = pickle.load(open(sys.argv[1], 'rb'))[sys.argv[3]]; Z = np.load(sys.argv[2])
X0, Y0 = 360, 60
P = np.zeros((946, 2206), np.float32); P[Y0:Y0 + 600, X0:X0 + 740] = Z[sys.argv[3] + '_P']
sil = np.zeros((946, 2206), np.uint8); sil[Y0:Y0 + 600, X0:X0 + 740] = Z[sys.argv[3] + '_sil'] > 0
wk = float(os.environ.get('OWK', 0.85)); soft = float(os.environ.get('OSOFT', 0.6))
lay, al = render_preview(D, (946, 2206), soft=soft, wk=(wk, 1), alpha=True)
R = P * (1 - al) + lay
Rg = forward(np.clip(R, 0, 1)) * 255; Sg = forward(np.clip(P, 0, 1)) * 255
m = cv2.erode(sil, np.ones((5, 5), np.uint8)) > 0
out = []
for k in (1, 2, 6):
    d = np.abs(cv2.GaussianBlur(Rg, (0, 0), k) - cv2.GaussianBlur(Sg, (0, 0), k)); out.append(f's{k} {d[m].mean():.2f}')
g = lambda a: np.hypot(*np.gradient(cv2.GaussianBlur(a, (0, 0), 0.7)))
hp = lambda a: (a - cv2.GaussianBlur(a, (0, 0), 3))
print(' '.join(out), f'mean {Rg[m].mean():.1f}/{Sg[m].mean():.1f}', f'grad99 {np.percentile(g(Rg)[m],99):.0f}/{np.percentile(g(Sg)[m],99):.0f}',
      f'hp-std {hp(Rg)[m].std():.1f}/{hp(Sg)[m].std():.1f}')
if len(sys.argv) > 4:
    ys, xs = np.nonzero(sil); x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    im = np.hstack([Rg[y0:y1, x0:x1], np.full((y1 - y0, 3), 255), Sg[y0:y1, x0:x1]]).clip(0, 255).astype(np.uint8)
    cv2.imwrite(sys.argv[4], cv2.resize(im, None, fx=1.3, fy=1.3, interpolation=cv2.INTER_CUBIC), [cv2.IMWRITE_JPEG_QUALITY, 90])
