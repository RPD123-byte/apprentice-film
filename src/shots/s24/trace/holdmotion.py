# page hold k8–18 (and k7 for the confetti): per-frame sub-pixel shift of each owl layer relative to the median, and
# each confetti piece's motion as D_i · f(k) with one shared ease profile f (f = 0 at the median frame's time)
import sys, re, json, os; sys.path.insert(0, '.')
from common import *
med = cv2.cvtColor(np.load('pageB_med.npy') / 255, cv2.COLOR_BGR2GRAY) * 255
def sh(u, box, m=20):
    x0, y0, x1, y1 = box; T = med[y0:y1, x0:x1].astype(np.float32); R = u[y0 - m:y1 + m, x0 - m:x1 + m].astype(np.float32)
    r = cv2.matchTemplate(R, T, cv2.TM_CCOEFF_NORMED); _, mx, _, (px, py) = cv2.minMaxLoc(r)
    def sub(a, b, c): d = a - 2 * b + c; return 0 if d == 0 else 0.5 * (a - c) / d
    fx = sub(r[py, px - 1], r[py, px], r[py, px + 1]) if 0 < px < r.shape[1] - 1 else 0
    fy = sub(r[py - 1, px], r[py, px], r[py + 1, px]) if 0 < py < r.shape[0] - 1 else 0
    return [round(px - m + fx, 2), round(py - m + fy, 2), round(mx, 3)]
BOX = {'B1': (1000, 300, 1200, 480), 'B2': (380, 220, 520, 330), 'B3': (1800, 630, 1930, 760)}
owl = {g: {k: sh(U(k), b) for k in range(8, 19)} for g, b in BOX.items()}
for g in owl: print(g, [owl[g][k][:2] for k in range(8, 19)])
cm = json.load(open('out/confetti_motion.json'))
s = open(os.path.join(SHOT_DIR, 'shards.js')).read()
CF = json.loads(re.search(r'export const CONFETTI = (\[.*?\]\]);', s, re.S).group(1))
ks = list(range(7, 19))
# profile from pieces tracked in all frames 8..18 with good scores
good = [i for i in range(len(CF)) if all(cm[str(k)][i] and cm[str(k)][i][2] > 0.7 for k in range(8, 19))]
M = np.array([[cm[str(k)][i][:2] for k in range(8, 19)] for i in good], float)  # (n, 11, 2)
amp = np.abs(M[:, 0, :]).max(1)
use = amp > 3
prof = np.median((M[use] / np.where(np.abs(M[use, :1, :]) > 2, M[use, :1, :], np.nan)).reshape(-1, 11, 2).transpose(0, 2, 1).reshape(-1, 11) * -1, axis=0) if use.any() else None
# robust: profile = median over pieces/axes of disp(k)/disp(8) with sign -> f(8) = -1
vals = []
for i in np.where(use)[0]:
    for ax in (0, 1):
        if abs(M[i, 0, ax]) >= 3: vals.append(-M[i, :, ax] / M[i, 0, ax])
f = np.median(np.array(vals), 0)
print('profile f(k8..18)', np.round(f, 3))
# D_i: least squares disp(k) = D * f(k) for k8..18 (k7 extrapolated with f7 fitted too)
D = {}
for i in range(len(CF)):
    rows = [(k, cm[str(k)][i]) for k in range(8, 19) if cm[str(k)][i] and cm[str(k)][i][2] > 0.6]
    if len(rows) < 4: D[i] = [0.0, 0.0]; continue
    ff = np.array([f[k - 8] for k, _ in rows]); dd = np.array([r[:2] for _, r in rows], float)
    D[i] = list(np.round((ff @ dd) / (ff @ ff), 2))
# k7: fit f7 from pieces with big D
num = den = 0
for i in range(len(CF)):
    r = cm['7'][i]
    if r and r[2] > 0.6 and np.hypot(*D[i]) > 3: num += np.dot(r[:2], D[i]); den += np.dot(D[i], D[i])
f7 = num / den if den else -1.5
print('f7', round(f7, 3))
json.dump({'owl': owl, 'f': [round(float(f7), 3)] + [round(float(v), 3) for v in f], 'D': [D[i] for i in range(len(CF))]}, open('out/hold.json', 'w'))
