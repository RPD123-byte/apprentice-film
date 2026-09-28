#!/usr/bin/env python3
# owlbox.py DIR [DIR...] : dE (sigma 1.5 / 4) inside the colour owl's box (old mask bbox + 30 px) per frame, per dir
import cv2, numpy as np, sys, glob, re
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
import owlmask as o
SRC = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas/src/'
def lab(im, s): return cv2.cvtColor(cv2.GaussianBlur(im.astype(np.float32) / 255, (0, 0), s), cv2.COLOR_BGR2LAB)
for d in sys.argv[1:]:
    out = []
    for p in sorted(glob.glob(d + '/r*.png')):
        F = int(re.search(r'r(\d+)\.png', p).group(1))
        if F < 2852: continue
        m = o.oldmask(F); ys, xs = np.nonzero(m)
        x0, x1, y0, y1 = max(0, xs.min() - 30), min(2206, xs.max() + 30), max(0, ys.min() - 30), min(946, ys.max() + 30)
        r = cv2.imread(p); s = cv2.imread(SRC + f'{F}.png')
        v = [float(np.sqrt(((lab(r, sg) - lab(s, sg)) ** 2).sum(2))[y0:y1, x0:x1].mean()) for sg in (1.5, 4)]
        out.append((F, v))
    print(d.split('/')[-1], ' '.join(f'{F}:{v[0]:.2f}' for F, v in out), '| mean s1.5=%.2f s4=%.2f' % (np.mean([v[0] for _, v in out]), np.mean([v[1] for _, v in out])))
