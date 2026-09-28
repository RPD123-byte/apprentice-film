# walksf.py DIR [DIR...]: single-frame metrics of the walk drawing in its own coords (owl footprint, the card excluded)
import sys, cv2, numpy as np, json, subprocess, os
sys.path.insert(0, '.')
from run import src
W = json.loads(subprocess.run(['node', '-e', "import('../../src/shots/s22/owlData.js').then(m=>console.log(JSON.stringify(m.TRACED.walk.meta.warp)))"], capture_output=True, text=True).stdout)
keys = sorted((float(t), v) for t, v in W.items())
def hold(t):
    r = keys[0][1]
    for k, v in keys:
        if k <= t + 0.005: r = v
    return r
U0, V0, U1, V1, S = -50, -40, 260, 170, 4
def warp(im, t):
    a, b, c, dd, e, f = hold(t); M = np.array([[a, c], [b, dd]], np.float32)
    Mx = np.zeros((2, 3), np.float32); Mx[:, :2] = M / S; Mx[:, 2] = np.array([e, f]) + M @ np.array([U0 + 0.5 / S - 0.5, V0 + 0.5 / S - 0.5])
    return cv2.warpAffine(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32), Mx, ((U1 - U0) * S, (V1 - V0) * S), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)
Sm = cv2.imread('../s22-p4-meas/walk_src_med.png', 0).astype(np.float32)
m = cv2.GaussianBlur(Sm, (0, 0), 8) > 150; m[:, :330] = False
hp = lambda x: x - cv2.GaussianBlur(x, (0, 0), 12)
for d in sys.argv[1:]:
    e1, e2, g1, g2 = [], [], [], []
    for F in range(2043, 2099, 1):
        if not os.path.exists(f'{d}/r{F:04d}.png') or not (81.72 <= F / 25 < 83.96): continue
        a = cv2.GaussianBlur(warp(cv2.imread(f'{d}/r{F:04d}.png'), F / 25), (0, 0), 2.8); b = cv2.GaussianBlur(warp(src(F), F / 25), (0, 0), 2.8)
        e1.append(np.abs(a - b)[m].mean()); e2.append(np.abs(hp(a) - hp(b))[m].mean())
        gr = lambda x: np.hypot(cv2.Sobel(x, cv2.CV_32F, 1, 0), cv2.Sobel(x, cv2.CV_32F, 0, 1))[m].mean()
        g1.append(gr(a)); g2.append(gr(b))
    print(f'{d}: n={len(e1)} MAE {np.mean(e1):.2f}  hp-MAE {np.mean(e2):.2f}  grad render {np.mean(g1):.2f} source {np.mean(g2):.2f}')
