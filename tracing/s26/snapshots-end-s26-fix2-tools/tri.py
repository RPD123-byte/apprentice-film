#!/usr/bin/env python3
# tri.py OUTDIR NEWDIR F1,F2,... [--box x0 y0 x1 y1] [--w W] [--base DIR]: base | new | source, labelled (measurement)
import cv2, numpy as np, sys, os
a = sys.argv[1:]; out, new = a[0], a[1]; Fs = [int(v) for v in a[2].split(',')]
box = [int(v) for v in a[a.index('--box')+1:a.index('--box')+5]] if '--box' in a else None
Wd = int(a[a.index('--w')+1]) if '--w' in a else 1100
base = a[a.index('--base')+1] if '--base' in a else '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix2-base'
SRC = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas/src/'
os.makedirs(out, exist_ok=True)
for F in Fs:
    ims = []
    for lbl, p in (('BEFORE (round 1)', f'{base}/r{F}.png'), ('AFTER', f'{new}/r{F}.png'), ('SOURCE', f'{SRC}{F}.png')):
        im = cv2.imread(p)
        if im is None: continue
        if box: im = im[box[1]:box[3], box[0]:box[2]]
        im = cv2.resize(im, (Wd, int(im.shape[0] * Wd / im.shape[1])), interpolation=cv2.INTER_AREA)
        cv2.putText(im, f'{lbl} F{F} t={F/25:.2f}', (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
        ims.append(im)
    cv2.imwrite(f'{out}/tri{F}.jpg', np.vstack(ims), [cv2.IMWRITE_JPEG_QUALITY, 90])
