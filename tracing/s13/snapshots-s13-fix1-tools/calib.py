# calib.py RENDERDIR PART [FRAME] : the hatching statistics (strokestats) of the render vs the source at the part's
# anchors (flowM.js): medians of render/source ratios for density, length, width and the value difference, over
# anchors where both have strokes (and the density ratio over all anchors with source strokes)
import sys, numpy as np, cv2
from cfg import *
import strokestats as SS
d, part = sys.argv[1], sys.argv[2]
job = [j for j in JOBS if j[0] == part][0]
fr = sys.argv[3] if len(sys.argv) > 3 else job[1].split('-')[0]
FL = jsdata('flowM')[part]
M = ringmask(rings_for(job[2], job[3]))
apply_exb(M, part)
f = int(fr); Rimg = cv2.imread(f'{d}/r{f}.png', 0).astype(np.float32)
Pr = ungrade(Rimg, f / 25 + 0.02)
A = [[a[0], a[1]] for a in FL]
Sr = SS.stats(None, M, A, Pimg=Pr, excl=keylines_mask(part))
rows = []
for a, r in zip(FL, Sr):
    if a[9] > 0: rows.append((a[9], r[3], a[6], r[0], a[7], r[1], a[8], r[2]))
rows = np.array(rows)
has = rows[:, 1] > 0
print(f'{part}: anchors {len(FL)}, src with strokes {len(rows)}, render with strokes there {has.sum()}')
print(f'  density  ratio (render/src)   median {np.median(rows[:,1]/rows[:,0]):.2f}  total {rows[:,1].sum()/rows[:,0].sum():.2f}')
print(f'  length   ratio               median {np.median(rows[has,3]/rows[has,2]):.2f}')
print(f'  width    ratio               median {np.median(rows[has,5]/rows[has,4]):.2f}')
print(f'  value    render - src        median {np.median(rows[has,7]-rows[has,6]):+.3f}')
nsrc0 = sum(1 for a, r in zip(FL, Sr) if a[9] == 0 and r[3] > 0)
print(f'  anchors where only the render has strokes: {nsrc0}')
