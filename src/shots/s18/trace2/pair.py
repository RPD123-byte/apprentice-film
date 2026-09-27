#!/usr/bin/env python3
# pair.py render.png ref.(png|npy) out.jpg x0 y0 x1 y1 [scale] [--pre] - zoomed render | ref pair (+ error numbers)
import sys, numpy as np, cv2
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from grade import forward
a = sys.argv
R = cv2.imread(a[1], 0).astype(np.float32)
S = np.load(a[2]).astype(np.float32) if a[2].endswith('.npy') else cv2.imread(a[2], 0).astype(np.float32)
if a[2].endswith('.npy'): S = S if S.max() > 2 else S * 255
if '--pre' in a:  # both pre-grade: grade them
    R = forward(R / 255) * 255; S = forward(S / 255) * 255
x0, y0, x1, y1 = [int(v) for v in a[4:8]]; sc = float(a[8]) if len(a) > 8 and not a[8].startswith('--') else 2
r, s = R[y0:y1, x0:x1], S[y0:y1, x0:x1]
print(' '.join(f's{k} {np.abs(cv2.GaussianBlur(r,(0,0),k)-cv2.GaussianBlur(s,(0,0),k)).mean():.2f}' for k in (1, 2, 6)), f'mean {r.mean():.1f}/{s.mean():.1f}',
      f'grad99 {np.percentile(np.hypot(*np.gradient(cv2.GaussianBlur(r,(0,0),0.7))),99):.0f}/{np.percentile(np.hypot(*np.gradient(cv2.GaussianBlur(s,(0,0),0.7))),99):.0f}')
im = np.hstack([r, np.full((r.shape[0], 3), 255), s]).clip(0, 255).astype(np.uint8)
cv2.imwrite(a[3], cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC if sc > 1 else cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 90])
