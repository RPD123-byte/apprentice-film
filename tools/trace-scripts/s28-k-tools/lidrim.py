# The lid's outer keyline relative to LIDQ's edges (top, right, left), per frame: at 9 points along each edge, the
# outermost dark ridge within -4..+22 px outward; line fit (offset at the edge's two ends). Also the rim colour
# (pre-grade median between the face edge + 2 px and the keyline - 2 px).
import sys, json; sys.path.insert(0, '.')
from geo import *
import grade28 as GR
def edge_off(g, A, B, s_out):
    d = (B - A) / np.linalg.norm(B - A); n = np.array([d[1], -d[0]]) * s_out
    res = []
    for s in np.linspace(0.12, 0.88, 9):
        P0 = A + s * (B - A)
        oo = np.arange(-6, 25, 0.5)
        pts = P0[None, :] + oo[:, None] * n[None, :] + np.linspace(-6, 6, 7)[:, None, None] * d[None, None, :]
        ok = (pts[..., 0] >= 0) & (pts[..., 0] < W) & (pts[..., 1] >= 0) & (pts[..., 1] < H - 4)
        if not ok.all(): continue
        v = cv2.remap(g, pts[..., 0].astype(np.float32), pts[..., 1].astype(np.float32), cv2.INTER_LINEAR).mean(0)
        bg = np.median(v[-6:]); thr = min(bg, 120) - 35
        # outermost local minimum below thr
        cand = [i for i in range(1, len(v) - 1) if v[i] <= v[i - 1] and v[i] <= v[i + 1] and v[i] < thr]
        if cand: res.append((s, oo[cand[-1]]))
    if len(res) < 4: return None
    s = np.array([r[0] for r in res]); o = np.array([r[1] for r in res])
    for _ in range(2):
        a, b = np.polyfit(s, o, 1); e = np.abs(o - (a * s + b))
        keep = e < max(2.0, 2.5 * np.median(e))
        s, o = s[keep], o[keep]
    b, a = np.polyfit(s, o, 1)
    return [round(float(a), 1), round(float(a + b), 1)]     # offset at s=0 and s=1
out = {}
ts = [round(129.28 + 0.04 * i, 2) for i in range(54)]
for t in ts:
    g = cv2.GaussianBlur(cv2.cvtColor(frame(round(t * 25)), cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 0.8)
    q = lidQuad(t); TL, TR, BR, BL = q; c = q.mean(0)
    row = {}
    for nm, (A, B) in {'top': (TL, TR), 'right': (TR, BR), 'left': (BL, TL)}.items():
        d = B - A; n = np.array([d[1], -d[0]]); sgn = 1 if np.dot(n, (A + B) / 2 - c) > 0 else -1
        row[nm] = edge_off(g, A, B, sgn)
    out['%.2f' % t] = row
    print(t, row, flush=True)
json.dump(out, open('lidrim.json', 'w'))
