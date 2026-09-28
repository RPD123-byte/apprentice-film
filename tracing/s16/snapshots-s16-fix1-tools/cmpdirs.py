# cmpdirs.py DIR_A DIR_B frames... : sigma-2 / sigma-4 error of the flying-owl box (and whole frame) for two render dirs
import sys, os, json, cv2, numpy as np; sys.path.insert(0, '.')
import h16
A, B = sys.argv[1], sys.argv[2]
for a in sys.argv[3:]:
    n = int(a); f = 1145 if n == 1146 else 1163 if n == 1164 else n
    p = f'../s16-fix1-work/owl3_{f}.json'
    box = tuple(json.load(open(p))['box']) if os.path.exists(p) and n < 1165 else (100, 590, 560, 920)
    S = h16.gray(h16.src(n)); out = [n]
    for d in (A, B):
        if not os.path.exists(f'{d}/r{n}.png'): out.append('-'); continue
        R = h16.gray(cv2.imread(f'{d}/r{n}.png').astype(np.float32))
        e = h16.errs(R, S, box, (1, 2, 4)); w = h16.errs(R, S, None, (2,))
        out.append('owl s1 %.2f s2 %.2f s4 %.2f | frame s2 %.2f' % (e[0], e[1], e[2], w[0]))
    print(*out)
