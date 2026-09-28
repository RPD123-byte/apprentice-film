#!/usr/bin/env python3
# sc.py DIR PREFIX [--sig 4,12] [--box x0 y0 x1 y1] [--frames a-b] [--q]: parallel blurred-dE scorer (per beat)
import cv2, numpy as np, sys, glob, re, json
from multiprocessing import Pool
a = sys.argv[1:]; d, pre = a[0], a[1]
sigs = [float(s) for s in (a[a.index('--sig')+1] if '--sig' in a else '4,12').split(',')]
box = [int(v) for v in a[a.index('--box')+1:a.index('--box')+5]] if '--box' in a else None
fr = [int(v) for v in a[a.index('--frames')+1].split('-')] if '--frames' in a else None
SRC = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas/src/'
BEATS = [('A', 2763, 2788), ('B', 2789, 2789), ('C', 2790, 2817), ('D', 2818, 2842), ('E', 2843, 2853), ('F1', 2854, 2887), ('F2', 2888, 2938)]
def lab(im, s):
    f = im.astype(np.float32) / 255.0
    if s > 0: f = cv2.GaussianBlur(f, (0, 0), s)
    return cv2.cvtColor(f, cv2.COLOR_BGR2LAB)
def one(p):
    F = int(re.search(r'(\d+)\.png$', p).group(1))
    r = cv2.imread(p); s = cv2.imread(f'{SRC}{F}.png')
    if box: r = r[max(0,box[1]-40):box[3]+40, max(0,box[0]-40):box[2]+40]; s = s[max(0,box[1]-40):box[3]+40, max(0,box[0]-40):box[2]+40]
    vals = []
    for sg in sigs:
        dE = np.sqrt(((lab(r, sg) - lab(s, sg)) ** 2).sum(2))
        if box: y0 = box[1] - max(0, box[1]-40); x0 = box[0] - max(0, box[0]-40); dE = dE[y0:y0 + box[3]-box[1], x0:x0 + box[2]-box[0]]
        vals.append(float(dE.mean()))
    return F, vals
if __name__ == '__main__':
    ps = [p for p in glob.glob(f'{d}/{pre}*.png') if re.search(rf'/{pre}(\d+)\.png$', p)]
    if fr: ps = [p for p in ps if fr[0] <= int(re.search(r'(\d+)\.png$', p).group(1)) <= fr[1]]
    with Pool(10) as pool: rows = sorted(pool.map(one, ps))
    if '--q' not in a:
        for F, v in rows: print(f'F{F} ' + ' '.join(f's{int(sg)}={x:.2f}' for sg, x in zip(sigs, v)))
    for nm, f0, f1 in BEATS:
        v = [x[1] for x in rows if f0 <= x[0] <= f1]
        if v: print(f'{nm:3s} {f0}-{f1} n={len(v):3d} ' + ' '.join(f's{int(sg)}={np.mean([q[i] for q in v]):.2f}' for i, sg in enumerate(sigs)))
    print('ALL n=%d ' % len(rows) + ' '.join(f's{int(sg)}={np.mean([q[1][i] for q in rows]):.2f}' for i, sg in enumerate(sigs)))
    if '--json' in a: json.dump(dict(rows), open(a[a.index('--json')+1], 'w'))
