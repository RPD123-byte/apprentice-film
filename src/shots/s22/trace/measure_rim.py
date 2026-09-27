#!/usr/bin/env python3
# Pass 4: the hole's torn rim, measured on the source (82.64–84.00). Measuring only — writes the rim's centre-line
# as coordinates (../rim.js), no pixels.
#   measure_rim.py [SOURCE.mp4] > ../rim.js
# Per column along the top and bottom rows (y 170–202 / 346–378) and per row down the sides (x 180–208 /
# 1962–1992): the half-maximum centroid of the rim's bright line on the median of 35 frames with the card masked out
# (the card quads of s22.js CARD, dilated 7 px); gaps (under the card in every frame) linearly interpolated; a 3-tap
# smoothing; RDP 0.35 px. Output in pixel-index coordinates (+0.5 applied in rim.js for canvas coordinates).
import sys, re, cv2, numpy as np, os
SRC = sys.argv[1] if len(sys.argv) > 1 else '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
txt = open(os.path.join(os.path.dirname(__file__), '..', '..', 's22.js')).read()
CARD = eval(re.search(r'const CARD = (\[.*?\]);', txt, re.S).group(1).replace('\n', ''))
def card_at(F):
    r = CARD[0]
    for k in CARD:
        if k[0] <= F / 25 + 0.005: r = k
    v = r[1:]; return np.array([[v[0], v[1]], [v[2], v[3]], [v[4], v[5]], [v[6], v[7]]], np.float32)
c = cv2.VideoCapture(SRC); c.set(cv2.CAP_PROP_POS_FRAMES, 2066)
st = []
for F in range(2066, 2101):
    ok, f = c.read(); g = cv2.GaussianBlur(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 0.8)
    m = np.zeros(g.shape, np.uint8); cv2.fillPoly(m, [np.round(card_at(F)).astype(np.int32)], 1)
    st.append(np.where(cv2.dilate(m, np.ones((15, 15), np.uint8)) > 0, np.nan, g))
med = np.nanmedian(np.stack(st), 0)
def ridge(prof, lo):
    p = np.nan_to_num(prof, nan=0); i = int(np.argmax(p))
    if p[i] < 90: return None
    j0 = j1 = i
    while j0 > 0 and p[j0 - 1] > 0.5 * p[i]: j0 -= 1
    while j1 < len(p) - 1 and p[j1 + 1] > 0.5 * p[i]: j1 += 1
    w = p[j0:j1 + 1] - 0.5 * p[i]; return lo + (np.arange(j0, j1 + 1) * w).sum() / max(1e-6, w.sum())
def side(pos, get):
    a = np.array([[q, np.nan if (v := get(q)) is None else v] for q in pos], float)
    ok = ~np.isnan(a[:, 1]); a[:, 1] = np.interp(a[:, 0], a[ok, 0], a[ok, 1]); b = a.copy(); b[1:-1, 1] = (a[:-2, 1] + a[1:-1, 1] + a[2:, 1]) / 3
    return b
def rdp(P, eps):
    if len(P) < 3: return list(map(tuple, P))
    A, B = P[0], P[-1]; ab = B - A; L = np.linalg.norm(ab) + 1e-9
    dd = np.abs(ab[0] * (P[1:-1, 1] - A[1]) - ab[1] * (P[1:-1, 0] - A[0])) / L; i = int(np.argmax(dd)) + 1
    return rdp(P[:i + 1], eps)[:-1] + rdp(P[i:], eps) if dd[i - 1] > eps else [tuple(A), tuple(B)]
top = rdp(side(range(196, 1976), lambda x: ridge(med[170:202, x], 170)), 0.35)
bot = rdp(side(range(196, 1976), lambda x: ridge(med[346:378, x], 346)), 0.35)
left = rdp(side(range(186, 360), lambda y: ridge(med[y, 180:208], 180))[:, ::-1], 0.35)
right = rdp(side(range(186, 360), lambda y: ridge(med[y, 1962:1992], 1962))[:, ::-1], 0.35)
ring = top + right + bot[::-1] + left[::-1]
print(','.join(f'{x:.1f},{y:.1f}' for x, y in ring))
