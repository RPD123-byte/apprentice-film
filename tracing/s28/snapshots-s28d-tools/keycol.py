# keycol.py key.json T -- median pre-grade colour of each measured part (hoodie = sil minus the others)
import sys, os, json, cv2, numpy as np
from lib import src, ungrade
K = json.load(open(sys.argv[1])); t = float(sys.argv[2])
cache = os.path.join(os.path.dirname(__file__), f'../s28d-seg/ung-{t:.2f}.png')
if os.path.exists(cache): p = cv2.imread(cache)
else:
    g = cv2.GaussianBlur(src(t).astype(np.float32) / 255, (0, 0), 1.0)
    p = np.clip(ungrade(g, t) * 255 + 0.5, 0, 255).astype(np.uint8); cv2.imwrite(cache, p)
def m_of(v):
    m = np.zeros(p.shape[:2], np.uint8)
    rings = v if isinstance(v[0][0], list) else [v]
    for r in rings: cv2.fillPoly(m, [np.array(r, np.int32)], 1) if rings.index(r) == 0 else None
    if len(rings) > 1:
        m2 = np.zeros_like(m)
        # even-odd
        for r in rings:
            mm = np.zeros_like(m); cv2.fillPoly(mm, [np.array(r, np.int32)], 1); m2 ^= mm
        m = m2
    return m
M = {n: m_of(v) for n, v in K.items() if n in ('sil', 'skinF', 'skinA', 'dark', 'beanie') and v}
hood = M['sil'].copy()
for n in ('skinF', 'skinA', 'dark', 'beanie'):
    if n in M: hood &= (1 - M[n])
M['hood'] = hood
if 'beanie' in M: M['beanie'] &= M['sil'] & (1 - M.get('dark', 0 * hood))
for n, m in M.items():
    e = cv2.erode(m, np.ones((5, 5), np.uint8)) > 0
    if e.sum() < 20: continue
    q = np.median(p[e], 0)[::-1]; lo = np.percentile(p[e].mean(1), 20); hi = np.percentile(p[e].mean(1), 80)
    print(f'{n:7s} #{int(q[0]):02x}{int(q[1]):02x}{int(q[2]):02x}  L20 {lo:.0f} L80 {hi:.0f}  n {e.sum()}')
