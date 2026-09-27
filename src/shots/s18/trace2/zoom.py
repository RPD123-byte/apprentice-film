#!/usr/bin/env python3
# zoom.py drawing.pkl ref_P.npy out.jpg x0 y0 x1 y1 [scale] [soft] - render | source | centre-lines overlay, zoomed
import sys, pickle, numpy as np, cv2
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from inktrace import render_preview
from grade import forward
D = pickle.load(open(sys.argv[1], 'rb')); P = np.load(sys.argv[2]).astype(np.float32); out = sys.argv[3]
x0, y0, x1, y1 = [int(v) for v in sys.argv[4:8]]; sc = float(sys.argv[8]) if len(sys.argv) > 8 else 3; soft = float(sys.argv[9]) if len(sys.argv) > 9 else 0.6
R = render_preview(D, P.shape, soft=soft)
g = lambda a: (forward(np.clip(a, 0, 1)) * 255).astype(np.uint8)
Rg, Sg = g(R)[y0:y1, x0:x1], g(P)[y0:y1, x0:x1]
Rf, Sf = Rg.astype(np.float32), Sg.astype(np.float32)
print(' '.join(f's{s} {np.abs(cv2.GaussianBlur(Rf,(0,0),s)-cv2.GaussianBlur(Sf,(0,0),s)).mean():.2f}' for s in (1,2,6)), f'mean {Rf.mean():.1f}/{Sf.mean():.1f}', f'grad99 {np.percentile(np.hypot(*np.gradient(Rf)),99):.0f}/{np.percentile(np.hypot(*np.gradient(Sf)),99):.0f}')
z = lambda a: cv2.resize(a, None, fx=sc, fy=sc, interpolation=cv2.INTER_NEAREST)
ov = cv2.cvtColor(z(Sg) // 2, cv2.COLOR_GRAY2BGR)
for rings, fd in D['masses']:
    for Rr in rings:
        p = np.round((Rr - [x0, y0]) * sc).astype(np.int32); cv2.polylines(ov, [p], True, (0, 200, 0), 1)
for key, col in (('dark', (0, 0, 255)), ('bright', (255, 160, 0))):
    for tone, pts, ws in D[key]:
        p = np.round((np.array(pts) - [x0, y0]) * sc).astype(np.int32); cv2.polylines(ov, [p], False, col, 1)
for x, y, r, v in D.get('dots', []):
    cv2.circle(ov, (int((x - x0) * sc), int((y - y0) * sc)), max(1, int(r * sc)), (255, 0, 255), 1)
dm = cv2.applyColorMap(np.clip(np.abs(cv2.GaussianBlur(Rf,(0,0),3)-cv2.GaussianBlur(Sf,(0,0),3))*5,0,255).astype(np.uint8), cv2.COLORMAP_INFERNO)
im = np.vstack([np.hstack([cv2.cvtColor(z(Rg), cv2.COLOR_GRAY2BGR), cv2.cvtColor(z(Sg), cv2.COLOR_GRAY2BGR)]), np.hstack([ov, z(dm)])])
cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 90])
