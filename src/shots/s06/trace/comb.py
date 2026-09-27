#!/usr/bin/env python3
# comb.py cfg.json out.json dbg.png — a comb of short ticks along a curve (e.g. the bristle edge above the upper lip),
# measured (measurement only): the darkness is sampled along a parallel of the base curve at offset `off`; each local
# maximum is a tick; its direction is the angle (within +-60 deg of the normal) with the darkest mean along a
# `len`-px segment, its length how far that stays dark, its width/value from the cross profile. Output strokes in the
# x y w v b format of trace.py.
import cv2, numpy as np, json, sys
cfg = json.load(open(sys.argv[1])); out, dbg = sys.argv[2], sys.argv[3]
pre = np.load(cfg['src']).astype(np.float32); pre = pre / 255 if pre.max() > 1.01 else pre
g = cv2.GaussianBlur(pre, (0, 0), 0.6)
k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
ground = cv2.GaussianBlur(cv2.erode(cv2.dilate(g, k), k), (0, 0), 2)
dark = np.clip(ground - g, 0, None)
S = lambda x, y: float(cv2.getRectSubPix(dark, (1, 1), (float(x), float(y)))[0, 0])
V = lambda im, x, y: float(cv2.getRectSubPix(im, (1, 1), (float(x), float(y)))[0, 0])
B = np.array(cfg['base'], float)
# dense resample of the base curve
d = np.r_[0, np.cumsum(np.hypot(*np.diff(B, axis=0).T))]; T = np.arange(0, d[-1], 0.5)
P = np.c_[np.interp(T, d, B[:, 0]), np.interp(T, d, B[:, 1])]
tg = np.gradient(P, axis=0); tg /= np.linalg.norm(tg, axis=1, keepdims=True); nm = np.c_[tg[:, 1], -tg[:, 0]]   # normal (up for a left->right curve)
off = cfg.get('off', 6.0); side = cfg.get('side', 1)
Q = P + side * nm * off
prof = np.array([S(x, y) for x, y in Q]); prof = np.convolve(prof, np.ones(3) / 3, 'same')
res = []
for i in range(2, len(prof) - 2):
    if prof[i] < cfg.get('min_dark', 0.04) or prof[i] < prof[i - 1] or prof[i] < prof[i + 1] or prof[i] < prof[i - 2] or prof[i] < prof[i + 2]: continue
    cx, cy = Q[i]; n0 = np.arctan2(side * nm[i][1], side * nm[i][0])
    best = None
    for da in np.radians(np.arange(-60, 61, 5)):
        a = n0 + da; u = np.array([np.cos(a), np.sin(a)])
        m = np.mean([S(cx + u[0] * t, cy + u[1] * t) for t in np.arange(-cfg.get('len', 10) / 2, cfg.get('len', 10) / 2 + 0.1, 1)])
        if best is None or m > best[0]: best = (m, a)
    a = best[1]; u = np.array([np.cos(a), np.sin(a)])
    # extent along the tick
    t0 = 0
    while t0 > -12 and S(cx + u[0] * (t0 - 1), cy + u[1] * (t0 - 1)) > 0.4 * prof[i]: t0 -= 1
    t1 = 0
    while t1 < 12 and S(cx + u[0] * (t1 + 1), cy + u[1] * (t1 + 1)) > 0.4 * prof[i]: t1 += 1
    if t1 - t0 < 2: continue
    row = []
    for t in (t0, (t0 + t1) / 2, t1):
        x, y = cx + u[0] * t, cy + u[1] * t
        pk = max(1e-4, S(x, y)); cs = [S(x - u[1] * o, y + u[0] * o) for o in np.arange(-3, 3.01, 0.5)]
        wd = float(np.sum([c for c in cs if c > 0.15 * pk]) * 0.5 / pk)
        row.append([round(x, 1), round(y, 1), round(max(0.5, min(3, wd)), 1), round(V(g, x, y), 3), round(V(ground, x, y), 3)])
    res.append(row)
json.dump(res, open(out, 'w'))
im = cv2.cvtColor((np.clip(pre, 0, 1) * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
x0, y0 = (B.min(0) - 20).astype(int); x1, y1 = (B.max(0) + 20).astype(int); Z = 4
view = cv2.resize(im[y0:y1, x0:x1], None, fx=Z, fy=Z, interpolation=cv2.INTER_CUBIC) // 2
for r in res: cv2.line(view, (int((r[0][0] - x0) * Z), int((r[0][1] - y0) * Z)), (int((r[-1][0] - x0) * Z), int((r[-1][1] - y0) * Z)), (0, 0, 255), 1)
cv2.imwrite(dbg, view); print(len(res), 'ticks')
