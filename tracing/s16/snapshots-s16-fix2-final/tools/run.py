# usage: run.py OUTDIR [frames...|all|key]  -> graded frames through the real post (no grain), errors vs source
import sys, os, time, cv2, numpy as np; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lab import Lab
import h16
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
a = sys.argv[2:] or ['key']
if a == ['all']: fr = list(range(1143, 1195))
elif a == ['key']: fr = [1143, 1145, 1148, 1151, 1154, 1157, 1160, 1163, 1175, 1188, 1192]
else: fr = [int(x) for x in a]
REG = {'fowl': None, 'sowl': (100, 590, 560, 920), 'mug': (690, 400, 930, 860), 'face': (1230, 60, 1640, 480), 'beanie': (1180, 0, 1680, 180),
       'shirt': (1360, 540, 1570, 850), 'jacket': (1050, 460, 1900, 850), 'desk': (500, 840, 2206, 946), 'neckhp': (1230, 420, 1760, 690)}
import json
OWLB = {}
for f_ in list(range(1143, 1164)):
    p_ = f'{os.path.dirname(os.path.abspath(__file__))}/../../s16-fix1-work/owl3_{f_}.json'
    if os.path.exists(p_): OWLB[f_] = tuple(json.load(open(p_))['box'])
L = Lab(); T = []
for n in fr:
    t0 = time.time(); r = L.graded(n, False); dt = time.time() - t0
    A = h16.gray(r.astype(np.float32)); B = h16.gray(h16.src(n))
    e = h16.errs(A, B)
    ow = OWLB.get(1145 if n == 1146 else 1163 if n == 1164 else n)
    reg = (f'fowl {h16.errs(A, B, ow, (2,))[0]:.2f} ' if ow else '') + ' '.join(f'{k} {h16.errs(A, B, v, (2,))[0]:.2f}' for k, v in REG.items() if v)
    print(f'F{n} s1 {e[0]:.2f} s2 {e[1]:.2f} s4 {e[2]:.2f} s8 {e[3]:.2f} | {reg} | {dt*1000:.0f}ms', flush=True)
    T.append(e)
    cv2.imwrite(f'{out}/r{n}.png', r)
print('MEAN', ' '.join(f'{x:.2f}' for x in np.mean(T, 0)))
L.close()
