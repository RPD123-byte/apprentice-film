# Where did the error change? mean over frames of |blur(r)-blur(s)| in F0 for two render dirs; prints the cells
# (CELL px) with the largest increase/decrease and writes a heat map.
# usage: python3 dmap.py DIR_A DIR_B frames sigma [x0 y0 x1 y1]
import cv2, numpy as np, sys, os
sys.path.insert(0, 'snapshots/s08-fix1r-tools')
from cam import M
A, B, spec, sig = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
box = list(map(int, sys.argv[5:9])) if len(sys.argv) > 8 else [0, 0, 2206, 946]
if "-" in spec: a, b = map(int, spec.split("-")); frames = list(range(a, b + 1))
else: frames = [int(v) for v in spec.split(",")]
CELL = 20
ea = eb = cnt = 0
sa = 0
for k in frames:
    m = M(k)
    w = lambda im: cv2.warpAffine(im.astype(np.float32), m, (2206, 946), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderValue=(-1, -1, -1))
    s = w(cv2.imread(f"snapshots/s08-p4-src/f{k}.png")); ra = w(cv2.imread(f"{A}/r{k}.png")); rb = w(cv2.imread(f"{B}/r{k}.png"))
    v = (s[..., 0] >= 0).astype(np.float32)
    bs = cv2.GaussianBlur(s, (0, 0), sig)
    ea = ea + np.abs(cv2.GaussianBlur(ra, (0, 0), sig) - bs).mean(-1) * v
    eb = eb + np.abs(cv2.GaussianBlur(rb, (0, 0), sig) - bs).mean(-1) * v
    sa = sa + (cv2.GaussianBlur(rb, (0, 0), sig) - bs).mean(-1) * v
    cnt = cnt + v
cnt = np.maximum(cnt, 1)
ea /= cnt; eb /= cnt; sa /= cnt
x0, y0, x1, y1 = box
d = (eb - ea)[y0:y1, x0:x1]
H, Wd = d.shape
cells = []
for j in range(0, H - CELL + 1, CELL):
    for i in range(0, Wd - CELL + 1, CELL):
        cells.append((d[j:j + CELL, i:i + CELL].mean(), i + x0, j + y0, eb[y0 + j:y0 + j + CELL, x0 + i:x0 + i + CELL].mean(), sa[y0 + j:y0 + j + CELL, x0 + i:x0 + i + CELL].mean()))
cells.sort()
print("B better (cell x,y: dErr, errB, signedB):", " ".join(f"({x},{y}:{v:+.1f},{e:.1f},{sg:+.1f})" for v, x, y, e, sg in cells[:12]))
print("B worse:", " ".join(f"({x},{y}:{v:+.1f},{e:.1f},{sg:+.1f})" for v, x, y, e, sg in cells[::-1][:12]))
print(f"box mean A {ea[y0:y1,x0:x1].mean():.3f} B {eb[y0:y1,x0:x1].mean():.3f}")
im = np.clip(128 + (eb - ea) * 20, 0, 255).astype(np.uint8)
cv2.imwrite(os.path.join(B, "dmap.png"), cv2.applyColorMap(im, cv2.COLORMAP_JET))
