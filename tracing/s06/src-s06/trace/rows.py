#!/usr/bin/env python3
# rows.py cfg.json out.json dbg.png — close parallel hatching (measurement only): the image is rotated so the hatch
# runs horizontally; in every column (step 1 px) the local minima of the darkness profile (sub-pixel) are found, and
# minima in neighbouring columns within `dy` px are linked into strokes. Each point gets the width (ink mass / peak)
# and the ungraded value and ground, like trace.py, so drawInk can redraw it. Output is in frame coordinates.
# cfg: {"src": pre.npy, "include": [poly], "angle": deg (hatch direction, 0 = horizontal), "dy": 1.2, "min_dark": 0.04,
#       "minlen": 6, "step": 2}
import cv2, numpy as np, json, sys
cfg = json.load(open(sys.argv[1])); out, dbg = sys.argv[2], sys.argv[3]
pre = np.load(cfg['src']).astype(np.float32); pre = pre / 255 if pre.max() > 1.01 else pre
H, W = pre.shape
poly = np.array(cfg['include'][0], np.float32)
x0, y0 = poly.min(0) - 12; x1, y1 = poly.max(0) + 12
x0, y0, x1, y1 = int(max(0, x0)), int(max(0, y0)), int(min(W, x1)), int(min(H, y1))
crop = pre[y0:y1, x0:x1]; h, w = crop.shape
ang = cfg.get('angle', 0.0); cx, cy = w / 2, h / 2
M = cv2.getRotationMatrix2D((cx, cy), ang, 1.0)      # rotates the hatch direction to horizontal
R = cv2.warpAffine(crop, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
mk = np.zeros((h, w), np.uint8); cv2.fillPoly(mk, [np.round(poly - [x0, y0]).astype(np.int32)], 1)
MR = cv2.warpAffine(mk, M, (w, h), flags=cv2.INTER_NEAREST)
Mi = cv2.invertAffineTransform(M)
g = cv2.GaussianBlur(R, (0, 0), 0.6)
k = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 9))
ground = cv2.GaussianBlur(cv2.erode(cv2.dilate(g, k), k), (0, 0), 1.5)
dark = np.clip(ground - g, 0, None)
mins = []   # per column: list of (y, darkness)
for x in range(w):
    col = dark[:, x]; ms = []
    for y in range(1, h - 1):
        if MR[y, x] and col[y] >= cfg.get('min_dark', 0.04) and col[y] >= col[y - 1] and col[y] > col[y + 1]:
            a, b, c = col[y - 1], col[y], col[y + 1]; d = a - 2 * b + c
            ms.append([y + (0.5 * (a - c) / d if d < -1e-6 else 0.0), float(b)])
    mins.append(ms)
strokes = []; open_ = []
for x in range(w):
    new_open = []; used = set()
    for s in open_:
        yl = s[-1][1]; best = None
        for j, (y, dk) in enumerate(mins[x]):
            if j in used: continue
            if abs(y - yl) <= cfg.get('dy', 1.2) and (best is None or abs(y - yl) < abs(mins[x][best][0] - yl)): best = j
        if best is None: strokes.append(s)
        else: used.add(best); s.append([x, mins[x][best][0], mins[x][best][1]]); new_open.append(s)
    for j, (y, dk) in enumerate(mins[x]):
        if j not in used: new_open.append([[x, y, dk]])
    open_ = new_open
strokes += open_
res = []
step = cfg.get('step', 2)
for s in strokes:
    if s[-1][0] - s[0][0] < cfg.get('minlen', 6): continue
    pts = s[::step] + ([s[-1]] if (len(s) - 1) % step else [])
    row = []
    for x, y, dk in pts:
        yi = int(round(y)); prof = dark[max(0, yi - 4):yi + 5, x]; pk = max(1e-4, dark[yi, x])
        c0 = min(4, yi); lo = c0
        while lo > 0 and prof[lo - 1] > 0.15 * pk and prof[lo - 1] <= prof[lo] + 0.03 * pk: lo -= 1
        hi = c0
        while hi < len(prof) - 1 and prof[hi + 1] > 0.15 * pk and prof[hi + 1] <= prof[hi] + 0.03 * pk: hi += 1
        wd = float(prof[lo:hi + 1].sum() / pk)
        fx, fy = Mi @ np.array([x, y, 1.0])
        row.append([round(float(fx + x0), 1), round(float(fy + y0), 1), round(max(0.6, wd), 1), round(float(g[yi, x]), 3), round(float(ground[yi, x]), 3)])
    res.append(row)
json.dump(res, open(out, 'w'))
im = cv2.cvtColor((np.clip(pre, 0, 1) * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
Z = 4; view = cv2.resize(im[y0:y1, x0:x1], None, fx=Z, fy=Z, interpolation=cv2.INTER_CUBIC) // 2
for r in res:
    for i in range(1, len(r)): cv2.line(view, (int((r[i - 1][0] - x0) * Z), int((r[i - 1][1] - y0) * Z)), (int((r[i][0] - x0) * Z), int((r[i][1] - y0) * Z)), (0, 0, 255), 1)
cv2.imwrite(dbg, view)
print(len(res), 'hatch strokes')
