# cardprof.py DIR F...: profiles across the card's bottom/right edges, render vs source (1 px steps, t=-10..10, 0 = quad edge)
import sys, re, cv2, numpy as np
sys.path.insert(0, '.')
from run import src, gray
txt = open('../../src/shots/s22.js').read()
CARD = eval(re.search(r'const CARD = (\[.*?\]);', txt, re.S).group(1).replace('\n', ''))
FIX = eval(re.search(r'const CARD_FIX = (\[.*?\]);', txt).group(1))
def card(F):
    r = CARD[0]
    for k in CARD:
        if k[0] <= F / 25 + 0.005: r = k
    return np.array([a + FIX[i] for i, a in enumerate(r[1:])]).reshape(4, 2)
def prof(im, p, n, L=10):
    ts = np.arange(-L, L + 1e-6, 1.0); pts = p[None, :] + ts[:, None] * n[None, :]
    return cv2.remap(im, pts[:, 0].astype(np.float32).reshape(1, -1), pts[:, 1].astype(np.float32).reshape(1, -1), cv2.INTER_LINEAR)[0]
d = sys.argv[1]; E = []
for F in [int(v) for v in sys.argv[2:]]:
    c = card(F); S = gray(src(F)); R = gray(cv2.imread(f'{d}/r{F:04d}.png'))
    for name, (i, j) in [('bot', (3, 2)), ('right', (1, 2))]:
        a, b = c[i], c[j]; dd = (b - a) / np.linalg.norm(b - a); n = np.array([-dd[1], dd[0]])
        if np.dot(n, (a + b) / 2 - c.mean(0)) < 0: n = -n
        for u in [0.3, 0.5, 0.7, 0.85]:
            p = a + (b - a) * u; ps = prof(S, p, n); pr = prof(R, p, n); E.append(np.abs(ps - pr)[8:].mean())
            print(F, f'{name:5s} {u:.2f} ({p[0]:.0f},{p[1]:.0f}) src', ' '.join('%3.0f' % v for v in ps[8:]), '| ren', ' '.join('%3.0f' % v for v in pr[8:]))
print('mean |src-ren| over t=-2..10:', np.mean(E))
