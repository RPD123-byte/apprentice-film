#!/usr/bin/env python3
# stats.py DIR : per frame mean luma, cell grid diffs (4x3), laplacian energy
import cv2, sys, glob, re, numpy as np
d = sys.argv[1]
for f in sorted(glob.glob(f'{d}/frame-*.png')):
    idx = re.search(r'frame-(\d+)-at-([\d.]+)s', f); i, t = idx.group(1), idx.group(2)
    r = glob.glob(f'{d}/ref-{i}-*.png')
    if not r: continue
    a = cv2.cvtColor(cv2.imread(f), cv2.COLOR_BGR2GRAY).astype(float); b = cv2.cvtColor(cv2.imread(r[0]), cv2.COLOR_BGR2GRAY).astype(float)
    H,W = a.shape
    cells = []
    for yy in range(3):
        row=[]
        for xx in range(4):
            sa = a[yy*H//3:(yy+1)*H//3, xx*W//4:(xx+1)*W//4]; sb = b[yy*H//3:(yy+1)*H//3, xx*W//4:(xx+1)*W//4]
            row.append(f'{sa.mean():5.1f}/{sb.mean():5.1f}')
        cells.append(' '.join(row))
    la = np.abs(cv2.Laplacian(cv2.GaussianBlur(a,(3,3),0), cv2.CV_64F)).mean(); lb = np.abs(cv2.Laplacian(cv2.GaussianBlur(b,(3,3),0), cv2.CV_64F)).mean()
    ba = cv2.GaussianBlur(a,(0,0),8); bb = cv2.GaussianBlur(b,(0,0),8)
    print(f't={t} mean {a.mean():.1f}/{b.mean():.1f} blurMAE {np.abs(ba-bb).mean():.1f} lap {la:.1f}/{lb:.1f}')
    for c in cells: print('   ', c)
