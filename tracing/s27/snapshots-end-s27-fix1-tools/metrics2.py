# per-frame metrics vs source for several render dirs: metrics2.py WORK OUT.json name:dir:prefix ...
# dE8 = CIE76 on sigma8-blurred Lab; s4 / s12 = mean abs RGB (0-255) after Gaussian blur; frames = those present in all dirs
import cv2, numpy as np, json, sys, os
from concurrent.futures import ProcessPoolExecutor
W, OUT = sys.argv[1], sys.argv[2]; V = [a.split(':') for a in sys.argv[3:]]
def blur(a, s): return cv2.GaussianBlur(a, (0, 0), s)
def lab(a): return cv2.cvtColor((a / 255).astype(np.float32), cv2.COLOR_BGR2Lab)
def m(a, b):
    a = a.astype(np.float32); b = b.astype(np.float32)
    return [round(float(np.sqrt(((lab(blur(a, 8)) - lab(blur(b, 8))) ** 2).sum(-1)).mean()), 3), round(float(np.abs(blur(a, 4) - blur(b, 4)).mean()), 2), round(float(np.abs(blur(a, 12) - blur(b, 12)).mean()), 2)]
def one(F):
    s = cv2.imread(f'{W}/src/s{F}.png'); r = {}
    for n, d, p in V: r[n] = m(cv2.imread(f'{W}/{d}/{p}{F}.png'), s)
    return F, r
if __name__ == '__main__':
    frames = sorted(int(f[1:-4]) for f in os.listdir(f'{W}/src'))
    frames = [F for F in frames if all(os.path.exists(f'{W}/{d}/{p}{F}.png') for _, d, p in V)]
    with ProcessPoolExecutor(8) as ex: R = dict(ex.map(one, frames))
    json.dump({str(k): v for k, v in R.items()}, open(OUT, 'w'))
    STR = [('s26 last 117.48', 117.48, 117.48), ('whip', 117.52, 117.90), ('hold', 117.92, 119.8), ('turn', 119.84, 124.6), ('hold2', 124.64, 126.3),
           ('owl', 126.32, 127.5), ('orbit', 127.52, 128.4), ('edge-on', 128.44, 128.8), ('end', 128.84, 129.28), ('ALL s27', 117.52, 129.28), ('s28 first 129.32', 129.32, 129.32)]
    print('%-17s %4s  ' % ('stretch', 'n') + '  '.join('%-20s' % n for n, _, _ in V))
    for nm, a, b in STR:
        ks = [F for F in R if a - 1e-6 <= F / 25 <= b + 1e-6]
        if not ks: continue
        print('%-17s %4d  ' % (nm, len(ks)) + '  '.join('%5.2f / %4.1f / %4.1f  ' % tuple(np.mean([R[k][n] for k in ks], 0)) for n, _, _ in V))
