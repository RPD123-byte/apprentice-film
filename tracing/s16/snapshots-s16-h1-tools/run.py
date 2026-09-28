# usage: run.py OUTDIR [frames...|all|key]  -> renders raw frames, grades (numpy port, no grain), prints errors
import sys, os, time, cv2, numpy as np; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lab import Lab
import h16
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
a = sys.argv[2:] or ['key']
if a == ['all']: fr = list(range(1143, 1195))
elif a == ['key']: fr = [1143, 1145, 1148, 1151, 1154, 1157, 1160, 1163, 1175, 1188, 1192, 1193]
else: fr = [int(x) for x in a]
REG = {'owl': (60, 440, 800, 946), 'mug': (680, 360, 930, 870), 'face': (1230, 60, 1640, 480), 'beanie': (1180, 0, 1680, 180),
       'shirt': (1000, 380, 1900, 760), 'laptop': (1080, 620, 1650, 840), 'desk': (500, 820, 2206, 946), 'right': (1650, 560, 2206, 900)}
L = Lab(); T = []
for n in fr:
    t0 = time.time(); r = L.raw(n); dt = time.time() - t0
    g = h16.grade(r, n); A = h16.gray(g); B = h16.gray(h16.src(n))
    e = h16.errs(A, B)
    reg = ' '.join(f'{k} {h16.errs(A, B, v, (2,))[0]:.2f}' for k, v in REG.items())
    print(f'F{n} s1 {e[0]:.2f} s2 {e[1]:.2f} s4 {e[2]:.2f} s8 {e[3]:.2f} | {reg} | {dt*1000:.0f}ms', flush=True)
    T.append(e)
    cv2.imwrite(f'{out}/r{n}.png', np.clip(g, 0, 255).astype(np.uint8))
print('MEAN', ' '.join(f'{x:.2f}' for x in np.mean(T, 0)))
L.close()
