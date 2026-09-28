# mottle.py DIR: card interior texture by band (σ0.7–1.5, 1.5–3, 3–6), render / source
import sys, cv2, numpy as np, glob, re
sys.path.insert(0, '.')
from cardm import cardAt, leftx, src, gray
d = sys.argv[1]
Fs = sorted(int(re.search(r'r(\d+)\.png', p).group(1)) for p in glob.glob(f'{d}/r*.png'))
for F in Fs:
    c = cardAt(F / 25); x0 = int(leftx(c, 300)) + 20; y0, y1 = 240, 340
    out = []
    for I in (gray(cv2.imread(f'{d}/r{F:04d}.png')), gray(src(F))):
        g = lambda s: cv2.GaussianBlur(I, (0, 0), s)
        out.append([(g(a) - g(b))[y0:y1, x0:x0 + 150].std() for a, b in ((0.7, 1.5), (1.5, 3), (3, 6))])
    print(F, ' '.join(f'{a:4.2f}/{b:4.2f}' for a, b in zip(*out)))
