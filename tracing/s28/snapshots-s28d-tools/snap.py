# Refine a hand-placed outline onto the source's ink line (measuring positions): samples the Catmull-Rom curve through
# the hand points every STEP px, searches +-R px along the normal for the darkest ink (blurred luminance minimum below
# DARK), median-smooths the offsets, and prints the refined polyline simplified to EPS.
# snap.py T 'x,y x,y ...' [--closed 1] [--r 12] [--dark 90] [--step 5] [--eps 1.5] [--out overlay.jpg] [--img file.png]
import sys, json, cv2, numpy as np
from lib import src
a = sys.argv[1:]; opts = {}; pos = []; i = 0
while i < len(a):
    if a[i].startswith('--'): opts[a[i][2:]] = a[i + 1]; i += 2
    else: pos.append(a[i]); i += 1
t = float(pos[0])
P = np.array([[float(v) for v in q.split(',')] for q in pos[1].split()])
closed = opts.get('closed', '0') == '1'
R = float(opts.get('r', 12)); DARK = float(opts.get('dark', 90)); STEP = float(opts.get('step', 5)); EPS = float(opts.get('eps', 1.5))
f = cv2.imread(opts['img']) if 'img' in opts else src(t)
L = cv2.GaussianBlur(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 1.0)

def cr(P, closed, per=40):
    n = len(P); out = []
    rng = range(n) if closed else range(n - 1)
    for i in rng:
        p0 = P[(i - 1) % n] if closed else P[max(0, i - 1)]
        p1 = P[i]; p2 = P[(i + 1) % n]; p3 = P[(i + 2) % n] if closed else P[min(n - 1, i + 2)]
        for k in range(per):
            u = k / per
            out.append(0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3))
    if not closed: out.append(P[-1])
    return np.array(out)

C = cr(P, closed)
seg = np.r_[0, np.cumsum(np.hypot(*np.diff(C, axis=0).T))]
s = np.arange(0, seg[-1], STEP)
S = np.c_[np.interp(s, seg, C[:, 0]), np.interp(s, seg, C[:, 1])]
T = np.gradient(S, axis=0); T /= np.linalg.norm(T, axis=1, keepdims=True) + 1e-9
N = np.c_[-T[:, 1], T[:, 0]]
ks = np.arange(-R, R + 0.5, 0.5)
M = np.zeros((len(S), len(ks)), np.float32)
for j, (p, n) in enumerate(zip(S, N)):
    q = p[None] + ks[:, None] * n[None]
    xs = np.clip(q[:, 0], 0, f.shape[1] - 1); ys = np.clip(q[:, 1], 0, f.shape[0] - 1)
    M[j] = cv2.remap(L, xs.astype(np.float32)[None], ys.astype(np.float32)[None], cv2.INTER_LINEAR)[0]
# Viterbi: darkest continuous ridge; small pull toward the hand line
lam = float(opts.get('lam', 6.0)); pull = float(opts.get('pull', 0.4))
cost = M[0] + np.abs(ks) * pull
back = np.zeros(M.shape, np.int32)
K = len(ks); idxk = np.arange(K)
trans = lam * np.abs(ks[:, None] - ks[None, :])
for j in range(1, len(S)):
    tot = cost[None, :] + trans            # [to, from]
    b = tot.argmin(1); back[j] = b
    cost = tot[idxk, b] + M[j] + np.abs(ks) * pull
k = int(cost.argmin()); path = [k]
for j in range(len(S) - 1, 0, -1):
    k = back[j, k]; path.append(k)
path = path[::-1]
off = ks[np.array(path)]
good = M[np.arange(len(S)), np.array(path)] < DARK
Q = S + N * off[:, None]
q = cv2.approxPolyDP(Q.astype(np.float32)[:, None, :], EPS, closed)[:, 0, :]
print(' '.join(f'{x:.1f},{y:.1f}' for x, y in q))
print('n', len(q), 'on ink', int(good.sum()), '/', len(good), file=sys.stderr)
if 'out' in opts:
    o = f.copy()
    cv2.polylines(o, [C.astype(np.int32)], closed, (255, 0, 0), 1)
    cv2.polylines(o, [q.astype(np.int32)], closed, (0, 255, 0), 1)
    x, y, w, h = cv2.boundingRect(q.astype(np.int32))
    cv2.imwrite(opts['out'], cv2.resize(o[max(0, y - 30):y + h + 30, max(0, x - 30):x + w + 30], None, fx=2, fy=2))
