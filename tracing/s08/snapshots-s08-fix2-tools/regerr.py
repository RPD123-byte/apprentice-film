# Per-region error in F0 coordinates (both frames warped into F0 through the camera table), blurred sigma 1 and 3.
# usage: python3 regerr.py RDIR [frames spec a-b or list] [regions]
import cv2, numpy as np, sys, os
sys.path.insert(0, 'snapshots/s08-fix2-tools')
from cam import M
rd = sys.argv[1]
spec = sys.argv[2] if len(sys.argv) > 2 else "764-814"
if "-" in spec: a, b = map(int, spec.split("-")); frames = list(range(a, b + 1))
else: frames = [int(v) for v in spec.split(",")]
REG = {
    "mark": (140, 0, 500, 180), "ucount": (355, 615, 455, 946), "rnub": (715, 700, 775, 765), "bottom": (700, 880, 870, 946),
    "tail": (2150, 225, 2206, 335), "sparkle": (1695, 880, 1768, 948), "pills": (1180, 0, 1560, 45),
    "date1": (12, 330, 760, 422), "colum": (110, 428, 420, 484), "ure": (0, 610, 1100, 946), "lobes": (0, 200, 560, 620),
    "ribbon": (780, 20, 1440, 700), "cloud": (1600, 700, 2206, 946), "card": (1450, 184, 1914, 830), "top": (0, 0, 2206, 30), "Uleft": (780, 20, 1250, 700), "Uright": (1250, 20, 1440, 700), "cardTL": (1400, 150, 1520, 260), "tailtop": (1440, 20, 2206, 200), "ground": (0, 0, 780, 200),
}
sel = sys.argv[3].split(",") if len(sys.argv) > 3 else list(REG)
acc = {n: [[], []] for n in sel}
for k in frames:
    if not os.path.exists(f"{rd}/r{k}.png"): continue
    m = M(k)
    Wd, Hd = 2206, 946
    s = cv2.warpAffine(cv2.imread(f"snapshots/s08-p4-src/f{k}.png").astype(np.float32), m, (Wd, Hd), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderValue=(-1, -1, -1))
    r = cv2.warpAffine(cv2.imread(f"{rd}/r{k}.png").astype(np.float32), m, (Wd, Hd), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderValue=(-1, -1, -1))
    valid = cv2.erode((s[..., 0] >= 0).astype(np.uint8), np.ones((9, 9), np.uint8))
    for sig, idx in ((1, 0), (3, 1)):
        d = np.abs(cv2.GaussianBlur(r, (0, 0), sig) - cv2.GaussianBlur(s, (0, 0), sig)).mean(-1)
        for n in sel:
            x0, y0, x1, y1 = REG[n]
            v = valid[y0:y1, x0:x1]
            if v.mean() < 0.3: continue
            acc[n][idx].append(d[y0:y1, x0:x1][v > 0].mean())
print(" ".join(f"{n} {np.mean(acc[n][0]):.2f}/{np.mean(acc[n][1]):.2f}({len(acc[n][0])})" if acc[n][0] else f"{n} -" for n in sel))
