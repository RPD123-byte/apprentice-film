# cardfit2.py DIR: per card pose (all its held source frames), corner corrections that put the render's card edges on
# the source's (50 % crossings along each edge's normal, a line fit per edge, corners solved from their two edges)
import sys, re, cv2, numpy as np, json
sys.path.insert(0, '.')
from run import src, gray
exec(open('cardfit.py').read().split("names = ['top'")[0].split("d = sys.argv[1]")[1].replace('', '')) if False else None
txt = open('../../src/shots/s22.js').read()
CARD = eval(re.search(r'const CARD = (\[.*?\]);', txt, re.S).group(1).replace('\n', ''))
FIX = eval(re.search(r'const CARD_FIX = (\[.*?\]);', txt).group(1))
ADJ = {round(r[0], 2): r[1:] for r in eval(re.search(r'const CARD_ADJ = (\[.*?\]);', txt, re.S).group(1).replace('\n', ''))} if 'const CARD_ADJ' in txt else {}
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
keys = [k for k in CARD if k[0] >= 81.6]
res = {}
for j, k in enumerate(keys):
    F0 = round(k[0] * 25); F1 = round(keys[j + 1][0] * 25) - 1 if j + 1 < len(keys) else min(2100, F0 + 1)
    c = np.array([a + FIX[i] + (ADJ.get(round(k[0], 2), [0] * 8)[i]) for i, a in enumerate(k[1:])]).reshape(4, 2)
    R = cv2.GaussianBlur(gray(cv2.imread(f'{d}/r{F0:04d}.png')), (0, 0), 1.0)
    Ss = [cv2.GaussianBlur(gray(src(F)), (0, 0), 1.0) for F in range(F0, F1 + 1)]
    E = []
    for e in range(4):
        a, b = c[e], c[(e + 1) % 4]; dd = (b - a) / np.linalg.norm(b - a); n = np.array([dd[1], -dd[0]])
        if np.dot(n, (a + b) / 2 - c.mean(0)) < 0: n = -n
        pts = []
        for u in np.linspace(0.1, 0.9, 9):
            p = a + (b - a) * u; ts, pr = prof(R, p, n); cr = cross(ts, pr)
            for S in Ss:
                _, ps = prof(S, p, n); cs = cross(ts, ps)
                if not np.isnan(cs) and not np.isnan(cr): pts.append((u, cs - cr))
        pts = np.array(pts)
        if len(pts) >= 5 and len(set(pts[:, 0])) >= 4:
            A = np.polyfit(pts[:, 0], pts[:, 1], 1); r = pts[:, 1] - np.polyval(A, pts[:, 0])
            keep = np.abs(r) < 2.5 * max(0.3, r.std())
            A = np.polyfit(pts[keep, 0], pts[keep, 1], 1)
            E.append((n, A[1], A[0] + A[1], int(keep.sum())))
        else: E.append((n, 0.0, 0.0, 0))
    # corner i is the start of edge i (u=0) and the end of edge i-1 (u=1)
    D = []
    for i in range(4):
        (n1, o1, _, k1), (n0, _, o0, k0) = E[i], E[(i - 1) % 4]
        M = np.array([n1, n0]); rhs = np.array([o1 if k1 else 0, o0 if k0 else 0])
        dlt = np.linalg.solve(M, rhs); dlt = np.clip(dlt, -5, 5); D.append(dlt)
    res[k[0]] = np.array(D).round(2).tolist()
    print(f'{k[0]:.2f} F{F0}-{F1}', ' '.join(f'({x:+.2f},{y:+.2f})' for x, y in D), ' n', [e[3] for e in E])
json.dump(res, open(f'{d}/cardfix.json', 'w'))
A = np.array([v for v in res.values()]); print('mean |corner corr| %.2f px, max %.2f' % (np.abs(A).mean(), np.abs(A).max()))
