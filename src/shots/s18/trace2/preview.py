#!/usr/bin/env python3
# preview.py drawing.pkl ref_P.npy out.jpg [soft] [crop x0 y0 x1 y1] - render the ink drawing (approx. of the JS
# renderer), grade both with grade.forward and print error numbers; writes render|ref pair
import sys, pickle, numpy as np, cv2
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from inktrace import render_preview
from grade import forward
D = pickle.load(open(sys.argv[1], 'rb')); P = np.load(sys.argv[2]).astype(np.float32); out = sys.argv[3]
soft = float(sys.argv[4]) if len(sys.argv) > 4 else 0.6
wk = tuple(float(v) for v in sys.argv[9].split(',')) if len(sys.argv) > 9 else (1.0, 1.0)
R = render_preview(D, P.shape, soft=soft, wk=wk)

g = lambda a: forward(np.clip(a, 0, 1)) * 255
Rg, Sg = g(R), g(P)
for s in (6, 2):
    print(f'sigma{s} MAE {np.abs(cv2.GaussianBlur(Rg,(0,0),s)-cv2.GaussianBlur(Sg,(0,0),s)).mean():.2f}', end='  ')
lap = lambda a: cv2.Laplacian(a.astype(np.float32), cv2.CV_32F).var()
print(f'lapvar {lap(Rg):.0f}/{lap(Sg):.0f} mean {Rg.mean():.1f}/{Sg.mean():.1f} dark<20 {(Rg<20).mean():.3f}/{(Sg<20).mean():.3f}')
if len(sys.argv) > 8 and sys.argv[5] != '-':
    x0, y0, x1, y1 = [int(v) for v in sys.argv[5:9]]; Rg = Rg[y0:y1, x0:x1]; Sg = Sg[y0:y1, x0:x1]
im = np.hstack([Rg, np.full((Rg.shape[0], 4), 255), Sg]).astype(np.uint8)
if im.shape[1] > 2400: im = cv2.resize(im, None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA)
cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 90])
