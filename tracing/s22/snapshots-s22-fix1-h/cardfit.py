# cardfit.py DIR: per card pose, the 50 % crossing offsets of each card edge, source vs render (along the outward normal)
import sys, re, cv2, numpy as np
sys.path.insert(0, '.')
from run import src, gray
txt = open('../../src/shots/s22.js').read()
CARD = eval(re.search(r'const CARD = (\[.*?\]);', txt, re.S).group(1).replace('\n', ''))
FIX = eval(re.search(r'const CARD_FIX = (\[.*?\]);', txt).group(1))
d = sys.argv[1]
def prof(im, p, n, L=8, st=0.25):
    ts = np.arange(-L, L + 1e-6, st); pts = p[None, :] + ts[:, None] * n[None, :]
    return ts, cv2.remap(im, pts[:, 0].astype(np.float32).reshape(1, -1), pts[:, 1].astype(np.float32).reshape(1, -1), cv2.INTER_LINEAR)[0]
def cross(ts, v):
    a = np.median(v[ts < -4]); b = np.median(v[ts > 5])
    if a - b < 80: return np.nan
    h = 0.5 * (a + b); i = np.where((v[:-1] >= h) & (v[1:] < h) & (ts[:-1] > -4) & (ts[:-1] < 4))[0]
    if len(i) == 0: return np.nan
    i = i[0]; return ts[i] + (v[i] - h) / (v[i] - v[i + 1]) * (ts[1] - ts[0])
names = ['top', 'right', 'bot', 'left']; out = []
for k in CARD:
    if k[0] < 81.6: continue
    F = round(k[0] * 25); v = [a + FIX[i] for i, a in enumerate(k[1:])]; c = np.array(v).reshape(4, 2)
    S = cv2.GaussianBlur(gray(src(F)), (0, 0), 1.0); R = cv2.GaussianBlur(gray(cv2.imread(f'{d}/r{F:04d}.png')), (0, 0), 1.0)
    row = [F]
    for e in range(4):
        a, b = c[e], c[(e + 1) % 4]; dd = (b - a) / np.linalg.norm(b - a); n = np.array([dd[1], -dd[0]])
        if np.dot(n, (a + b) / 2 - c.mean(0)) < 0: n = -n
        res = []
        for u in np.linspace(0.1, 0.9, 9):
            p = a + (b - a) * u; ts, ps = prof(S, p, n); _, pr = prof(R, p, n)
            res.append((u, cross(ts, ps), cross(ts, pr)))
        res = np.array(res); ok = ~np.isnan(res[:, 1]) & ~np.isnan(res[:, 2])
        dlt = res[ok, 1] - res[ok, 2]
        if ok.sum() >= 3:
            A = np.polyfit(res[ok, 0], dlt, 1); row += [A[1], A[0] + A[1], ok.sum()]   # offset at u=0 and u=1
        else: row += [np.nan, np.nan, ok.sum()]
    out.append(row)
    print(F, ' '.join(f'{names[e]}: {row[1+3*e]:+5.2f}..{row[2+3*e]:+5.2f} (n{row[3+3*e]})' for e in range(4)))
np.save(f'{d}/cardfit.npy', np.array(out, float))
