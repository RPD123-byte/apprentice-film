# tunetest.py '<json list of [roomTune, owlTune, engraveOverrides]>' frames : region errors for tune variants
import sys, json, cv2, numpy as np; sys.path.insert(0, '.')
from lab import Lab
import h16
V = json.loads(sys.argv[1]); fr = [int(a) for a in sys.argv[2:]] or [1175]
REG = {'face': (1230, 60, 1640, 480), 'beanie': (1180, 0, 1680, 180), 'shirt': (1360, 540, 1600, 850), 'jacket': (1050, 460, 1900, 850),
       'desk': (500, 840, 2206, 946), 'neckhp': (1230, 420, 1760, 690), 'mug': (690, 400, 930, 860)}
L = Lab()
for v in V:
    r, o, e = (v + [None, None, None])[:3]
    L.tunes = []; L.reload()
    if e: L.p.evaluate('(e) => { Object.assign(S16H.ENGRAVE, e); S16H.shot.release(); }', e)
    if r or o: L.tune(r, o)
    acc = []
    for n in fr:
        A = h16.gray(L.graded(n, False).astype(np.float32)); B = h16.gray(h16.src(n))
        acc.append([h16.errs(A, B, None, (2,))[0]] + [h16.errs(A, B, b, (2,))[0] for b in REG.values()])
    m = np.mean(acc, 0)
    print(json.dumps(v), 'all %.3f ' % m[0] + ' '.join('%s %.2f' % (k, x) for k, x in zip(REG, m[1:])), flush=True)
L.close()
