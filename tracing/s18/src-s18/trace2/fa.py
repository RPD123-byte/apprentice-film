#!/usr/bin/env python3
# fa.py renderdir [frames] [--pairs outdir] [--crop x0 y0 x1 y1] - frame-accurate comparison of harness renders
# r<n>.png (source frame n exactly) against the source frame: blurred MAE (sigma 6 / 2), mean, sharpness
import sys, os, glob, re, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from common import frame
a = sys.argv; d = a[1]
fr = sorted(int(re.search(r'r(\d+)\.png', p).group(1)) for p in glob.glob(d + '/r*.png'))
if len(a) > 2 and not a[2].startswith('--'):
    want = set()
    for part in a[2].split(','):
        if '-' in part: x, y = map(int, part.split('-')); want |= set(range(x, y + 1))
        else: want.add(int(part))
    fr = [n for n in fr if n in want]
pairs = a[a.index('--pairs') + 1] if '--pairs' in a else None
crop = [int(v) for v in a[a.index('--crop') + 1:a.index('--crop') + 5]] if '--crop' in a else None
if pairs: os.makedirs(pairs, exist_ok=True)
tot = []
for n in fr:
    R = cv2.imread(f'{d}/r{n}.png', 0).astype(np.float32); S = frame(n).astype(np.float32)
    if crop: x0, y0, x1, y1 = crop; R = R[y0:y1, x0:x1]; S = S[y0:y1, x0:x1]
    b6 = np.abs(cv2.GaussianBlur(R, (0, 0), 6) - cv2.GaussianBlur(S, (0, 0), 6)).mean()
    b2 = np.abs(cv2.GaussianBlur(R, (0, 0), 2) - cv2.GaussianBlur(S, (0, 0), 2)).mean()
    lr, ls = cv2.Laplacian(R, cv2.CV_32F).var(), cv2.Laplacian(S, cv2.CV_32F).var()
    tot.append(b6)
    print(f'{n} b6 {b6:.2f} b2 {b2:.2f} mean {R.mean():.1f}/{S.mean():.1f} lapvar {lr:.0f}/{ls:.0f} dark<20 {(R<20).mean():.3f}/{(S<20).mean():.3f}')
    if pairs:
        Rc = cv2.imread(f'{d}/r{n}.png'); Sc = frame(n, False)
        if crop: Rc = Rc[y0:y1, x0:x1]; Sc = Sc[y0:y1, x0:x1]
        im = np.hstack([Rc, np.full((Rc.shape[0], 6, 3), (0, 0, 255), np.uint8), Sc])
        if im.shape[1] > 2400: im = cv2.resize(im, None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA)
        cv2.putText(im, f'R{n}', (8, 28), 0, 0.9, (0, 0, 255), 2); cv2.putText(im, f'S{n}', (im.shape[1] // 2 + 8, 28), 0, 0.9, (0, 0, 255), 2)
        cv2.imwrite(f'{pairs}/p{n}.jpg', im, [cv2.IMWRITE_JPEG_QUALITY, 88])
if tot: print(f'mean b6 {np.mean(tot):.2f} max {np.max(tot):.2f}')
