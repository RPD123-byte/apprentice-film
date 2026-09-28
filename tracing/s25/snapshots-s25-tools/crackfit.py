#!/usr/bin/env python3
# crackfit.py A|B -- refine the crack network's straight segments on the source: a crack-ridge map (white top-hat) as the
# median over many frames of the phase (standing frames warped to the 104.60 page space by the measured camera; the
# owl's region left out per frame), then each segment's endpoints are moved (+-5 px) to maximise the mean ridge along
# it; finally uncovered ridge pieces are added as new segments (probabilistic Hough). Writes ../s25-meas/cracks-X.json.
import cv2, numpy as np, json, sys, os
from tojs3 import cam
HERE = os.path.dirname(os.path.abspath(__file__)); MEAS = os.path.join(HERE, '..', 's25-meas')
SRC = os.path.join(HERE, '..', 's25-src', 'f%05d.png')
which = sys.argv[1]
ADD = False  # additions picked up page texture (cabinet slats, keys) as well as cracks: off
d = json.load(open(os.path.join(MEAS, 'cracks.json')))[which]
segs = np.array(d, float).reshape(-1, 4)
OLD = json.load(open(os.path.join(MEAS, 'oldmasks.json')))
SCHED = json.load(open(os.path.join(MEAS, 'sched.json')))
def ridge(g):
    th = cv2.morphologyEx(cv2.GaussianBlur(g, (0, 0), 0.8), cv2.MORPH_TOPHAT, np.ones((9, 9), np.uint8)).astype(np.float32)
    return np.clip(th / 120.0, 0, 1)
stack = []
if which == 'B':
    frames = list(range(2592, 2760, 7))
    for f in frames:
        g = cv2.imread(SRC % f, 0)
        R = ridge(g)
        m = np.zeros_like(g)
        r = SCHED['SCHED'][f - SCHED['SCHED_F0']]
        a, b, c, dd, e, ff = r[1:7]; A = np.array([[a, c, e], [b, dd, ff], [0, 0, 1]])
        M = cam(f) @ A
        for ring in OLD[r[0]]['mask']:
            p = np.array(ring).reshape(-1, 2); q = (M[:2, :2] @ p.T).T + M[:2, 2]
            cv2.fillPoly(m, [np.round(q).astype(np.int32)], 1)
        if f >= 2673: m[150:480, 500:1600] = 1
        m = cv2.dilate(m, np.ones((21, 21), np.uint8))
        R[m > 0] = np.nan
        Ci = np.linalg.inv(cam(f))
        Rw = cv2.warpAffine(np.nan_to_num(R, nan=-1), Ci[:2], (2206, 946), flags=cv2.INTER_LINEAR, borderValue=-1)
        Rw[Rw < 0] = np.nan
        stack.append(Rw)
else:
    frames = list(range(2516, 2566, 3))
    for f in frames:
        g = cv2.imread(SRC % f, 0)
        stack.append(ridge(g))
R = np.nanmedian(np.stack(stack), 0)
R = np.nan_to_num(R, nan=0).astype(np.float32)
np.save(os.path.join(MEAS, f'ridge-{which}.npy'), R)
Rb = cv2.GaussianBlur(R, (0, 0), 1.0)
def score(s):
    x0, y0, x1, y1 = s; L = max(2, int(np.hypot(x1 - x0, y1 - y0)))
    t = np.linspace(0, 1, L)
    xs = (x0 + (x1 - x0) * t).astype(np.float32); ys = (y0 + (y1 - y0) * t).astype(np.float32)
    v = cv2.remap(Rb, xs[None], ys[None], cv2.INTER_LINEAR, borderValue=0)[0]
    return float(v.mean())
new = []
for s in segs:
    best = s.copy(); bs = score(s)
    for step in (3.0, 1.5, 0.75, 0.4):
        improved = True
        while improved:
            improved = False
            for k in range(4):
                for dv in (-step, step):
                    q = best.copy(); q[k] += dv
                    sc = score(q)
                    if sc > bs + 1e-4 and abs(q[k] - s[k]) <= 5: best, bs, improved = q, sc, True
    new.append((best, bs, score(s)))
before = np.mean([n[2] for n in new]); after = np.mean([n[1] for n in new])
print('segments', len(new), 'mean ridge before %.3f after %.3f' % (before, after))
keep = [n[0] for n in new]
print('kept', len(keep))
# coverage and additions
cov = np.zeros((946, 2206), np.uint8)
for x0, y0, x1, y1 in keep: cv2.line(cov, (int(round(x0)), int(round(y0))), (int(round(x1)), int(round(y1))), 1, 7)
rest = ((R > 0.35) & (cov == 0)).astype(np.uint8)
valid = np.zeros_like(rest); valid[132:912, 148:2020] = 1
if which == 'B': valid[250:946, 700:1450] = 0   # the owl's usual place: no additions from sparse medians there
rest &= valid
lines = cv2.HoughLinesP(rest * 255, 1, np.pi / 360, threshold=18, minLineLength=28, maxLineGap=4)
adds = []
if lines is not None:
    for l in lines[:, 0]:
        x0, y0, x1, y1 = [float(v) for v in l]
        if ADD and score((x0, y0, x1, y1)) > 0.3: adds.append([x0, y0, x1, y1])
print('added', len(adds))
out = [round(float(v), 1) for s in keep for v in s] + [round(v, 1) for s in adds for v in s]
json.dump(out, open(os.path.join(MEAS, f'cracks-{which}.json'), 'w'))
vis = cv2.cvtColor((np.clip(R, 0, 1) * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
for x0, y0, x1, y1 in keep: cv2.line(vis, (int(x0), int(y0)), (int(x1), int(y1)), (0, 0, 255), 1)
for x0, y0, x1, y1 in adds: cv2.line(vis, (int(x0), int(y0)), (int(x1), int(y1)), (0, 255, 0), 1)
cv2.imwrite(os.path.join(MEAS, f'cracks-{which}.jpg'), cv2.resize(vis, None, fx=0.6, fy=0.6))
