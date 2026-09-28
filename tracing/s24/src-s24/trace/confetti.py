# per-frame motion of each confetti piece in the page hold (k7..k18) relative to the k8–18 median
import sys, re, json, os; sys.path.insert(0, '.')
from common import *
med = cv2.cvtColor(np.load('pageB_med.npy') / 255, cv2.COLOR_BGR2GRAY) * 255
s = open(os.path.join(SHOT_DIR, 'shards.js')).read()
CF = json.loads(re.search(r'export const CONFETTI = (\[.*?\]\]);', s, re.S).group(1))
res = {}
for k in range(7, 19):
    u = U(k); row = []
    for (x, y, w, h, a) in CF:
        R_ = int(max(w, h) / 2 + 6); m = 14
        x0, y0 = int(x - R_), int(y - R_)
        if x0 - m < 0 or y0 - m < 0 or x0 + 2 * R_ + m > 2206 or y0 + 2 * R_ + m > 946: row.append(None); continue
        T = med[y0:y0 + 2 * R_, x0:x0 + 2 * R_].astype(np.float32)
        Rg = u[y0 - m:y0 + 2 * R_ + m, x0 - m:x0 + 2 * R_ + m].astype(np.float32)
        r = cv2.matchTemplate(Rg, T, cv2.TM_CCOEFF_NORMED); _, mx, _, (px, py) = cv2.minMaxLoc(r)
        row.append((px - m, py - m, round(mx, 2)))
    res[k] = row
for i in range(0, len(CF), 5):
    print(i, CF[i][:2], [res[k][i][:2] if res[k][i] and res[k][i][2] > 0.6 else None for k in range(7, 19)])
json.dump(res, open('out/confetti_motion.json', 'w'))
