#!/usr/bin/env python3
# s16 desk front (this pass): the lit plank and the dark band under it, measured on the clean plate (plateE) into
# data/desk.js (geometry only):
#   PLANK  the plank's outline (its top and bottom edges read column by column, smoothed)
#   BASE   the plank's light between its grain lines: the upper envelope of each column, on a coarse grid (40 x 4 px)
#   GRAIN  the grain: dark lines traced column by column (local minima with >= 0.1 prominence, linked across columns,
#          smoothed, simplified); per point [x, y, width at half depth, darkest value]
#   UNDER  the fine pale lines in the dark under the desk, the same way (maxima)
#   CUT    where cables cross the plank (dark vertical runs >= 13 px): outlines the plank layer leaves open
# Usage: python3 desk.py
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import m16, cv2, numpy as np
OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'desk.js')
M = m16.M
# the full plate (it reaches M px past every frame edge: the jolt and the pull-back show the margins); the arrays
# below are indexed in frame px + M
EF = m16.plateE()
class Sh:                              # frame-px view of a plate array
    def __init__(s, a): s.a = a
    def __getitem__(s, k):
        ys, xs = k if isinstance(k, tuple) else (k, slice(None))
        f = lambda v: slice(v.start + M if v.start is not None else None, v.stop + M if v.stop is not None else None) if isinstance(v, slice) else v + M
        return s.a[f(ys), f(xs)]
E = Sh(EF)
Y = Sh(cv2.GaussianBlur(EF, (0, 0), 0.7))
X0, X1 = 560, 2206 + M - 2
# ---- plank edges per column (the plank is lit; above it the dark room, below the dark under-desk band)
top = np.full(X1, np.nan); bot = np.full(X1, np.nan)
Yb = Sh(cv2.GaussianBlur(EF, (0, 0), 1.5))
for x in range(X0, X1):
    col = Yb[836:915, x]
    lit = col > 0.3
    # top: first lit row after >= 3 dark rows above 846
    ys = np.nonzero(lit)[0]
    if len(ys) < 10: continue
    t0 = 836 + ys[0]; b0 = 836 + ys[-1]
    top[x] = t0; bot[x] = b0
def smooth_edge(e, lo, hi, win=41):
    x = np.arange(len(e)); ok = ~np.isnan(e) & (e >= lo) & (e <= hi)
    v = np.interp(x, x[ok], e[ok])
    k = np.ones(win) / win
    return np.convolve(np.pad(v, win // 2, mode='edge'), k, 'valid')
# robust: the plank's top is 846-853 and its bottom 889-900 wherever it is clean
topS = smooth_edge(top, 845, 854); botS = smooth_edge(bot, 888, 900)
xs = np.arange(X0, X1 + 1, 8); xs[-1] = X1 - 1
PLANK = [[float(x), round(float(topS[x]) + 0.2, 1)] for x in xs] + [[float(x), round(float(botS[x]) + 0.5, 1)] for x in xs[::-1]]
# ---- grain: column minima inside the plank, linked
def trace(mode, ylo, yhi, prom, xstep=1, gap=3, dy=1.3, minlen=14):
    lines, active = [], []
    for x in range(X0, X1, xstep):
        col = Y.a[M:, x + M]                   # rows in frame px (0 .. 946 + M)
        p = col if mode == 'dark' else -col
        a = int(np.ceil(ylo(x))); b = int(np.floor(yhi(x)))
        pts = []
        for y in range(a + 1, b - 1):
            if p[y] <= p[y - 1] and p[y] < p[y + 1]:
                # prominence against the highest within +-4 px on each side
                l = p[max(a, y - 4):y].max(); r = p[y + 1:min(b, y + 5)].max()
                pr = min(l, r) - p[y]
                if pr < (prom if x > 830 or mode != 'dark' else max(prom, 0.2)): continue
                # sub-pixel minimum (parabola)
                den = p[y - 1] - 2 * p[y] + p[y + 1]; off = 0.5 * (p[y - 1] - p[y + 1]) / den if den > 1e-6 else 0
                half = p[y] + pr / 2
                u = y
                while u > a and p[u - 1] < half: u -= 1
                d = y
                while d < b - 1 and p[d + 1] < half: d += 1
                pts.append([y + off, min(2.4, max(0.8, d - u + 1.0)), float(Y[y, x]), pr])
        used = set()
        for L in active:
            if x - L['last'] > gap: continue
            best, bd = None, dy
            for i, q in enumerate(pts):
                if i in used: continue
                dd = abs(q[0] - L['pts'][-1][1])
                if dd < bd: best, bd = i, dd
            if best is not None:
                used.add(best); q = pts[best]; L['pts'].append([x, q[0], q[1], q[2]]); L['last'] = x
        still = []
        for L in active:
            if x - L['last'] > gap: lines.append(L)
            else: still.append(L)
        active = still
        for i, q in enumerate(pts):
            if i not in used: active.append({'pts': [[x, q[0], q[1], q[2]]], 'last': x})
    lines += active
    out = []
    for L in lines:
        P = np.array(L['pts'], float)
        if P[-1, 0] - P[0, 0] < minlen: continue
        # smooth y / width / value along x, then resample every 4 px
        k = 5
        if len(P) > k:
            for c in (1, 2, 3):
                P[:, c] = np.convolve(np.pad(P[:, c], k // 2, mode='edge'), np.ones(k) / k, 'valid')
        n = max(2, int((P[-1, 0] - P[0, 0]) / 4) + 1)
        xq = np.linspace(P[0, 0], P[-1, 0], n)
        row = [[round(float(x), 1), round(float(np.interp(x, P[:, 0], P[:, 1])), 2), round(float(np.interp(x, P[:, 0], P[:, 2])), 2),
                round(float(np.interp(x, P[:, 0], P[:, 3])), 3)] for x in xq]
        out.append(row)
    return out
GRAIN = trace('dark', lambda x: topS[x] + 1.5, lambda x: botS[x] - 1.0, 0.10)
UNDER = trace('pale', lambda x: botS[x] + 4, lambda x: 946 + M - 2, 0.05, minlen=20)
UNDER = [s for s in UNDER if np.mean([p[3] for p in s]) > 0.1]
# ---- base: upper envelope (dilate 7 px vertically, blur), sampled on a 40 x 4 px grid over the plank
env = Sh(cv2.GaussianBlur(cv2.dilate(EF, np.ones((7, 1), np.uint8)), (0, 0), 3))
GX = np.arange(X0 - 40, X1 + 41, 40); GY = np.arange(844, 902, 4)
BASE = np.array([[float(env[int(y), min(X1, max(0, int(x)))]) for x in GX] for y in GY])
# light matching (usage: desk.py cal RAW.png [gain]): the plank's light between the lines is moved by the difference of
# the blurred source and a raw render of the film's own room (pre-grade), sampled on the grid; kept in the work dir
BF = m16.ROOT + '/snapshots/s16-h1-work/desk_base.npy'
if len(sys.argv) > 1 and sys.argv[1] == 'cal':
    BASE = np.load(BF)
    raw = cv2.imread(sys.argv[2], 0).astype(np.float32) / 255
    gain = float(sys.argv[3]) if len(sys.argv) > 3 else 0.8
    S4 = cv2.GaussianBlur(EF[M:M + 946, M:M + 2206], (0, 0), 4); R4 = cv2.GaussianBlur(raw, (0, 0), 4)
    pm = np.zeros((946, 2206), np.uint8)
    cv2.fillPoly(pm, [np.round(np.array(PLANK) * 4).astype(np.int32)], 1, shift=2)
    pm = cv2.erode(pm, np.ones((5, 5), np.uint8))
    d = []
    for j, y in enumerate(GY):
        for i, x in enumerate(GX):
            y0, y1, x0, x1 = int(y) - 2, int(y) + 3, max(0, int(x) - 20), min(2206, int(x) + 20)
            if y1 > 946 or x0 >= 2206: continue
            m = pm[y0:y1, x0:x1] > 0
            if m.sum() < 20: continue
            dd = float((S4[y0:y1, x0:x1] - R4[y0:y1, x0:x1])[m].mean())
            BASE[j, i] = np.clip(BASE[j, i] + gain * dd, 0, 1); d.append(abs(dd))
    print('cal: mean |diff| %.4f over %d cells' % (np.mean(d), len(d)))
np.save(BF, BASE)
BASE = [[round(float(v), 3) for v in row] for row in BASE]
# ---- cable cuts: dark vertical runs across the plank
dk = ((Yb.a < 0.33).astype(np.uint8))
band = np.zeros_like(dk)
for x in range(X0, X1): band[int(topS[x] + 2) + M:int(botS[x] - 1) + M, x + M] = 1
vr = cv2.morphologyEx(dk, cv2.MORPH_OPEN, np.ones((13, 1), np.uint8)) & band
vr = cv2.dilate(vr, np.ones((3, 3), np.uint8))
CUT = m16.isolines(cv2.GaussianBlur(vr.astype(np.float32), (0, 0), 1.0), 0.5, 0.8, 30, off=(-M, -M))
print('plank pts', len(PLANK), 'grain', len(GRAIN), 'under', len(UNDER), 'cuts', len(CUT))
def js_lines(S): return ',\n'.join('[' + ','.join('%g,%g,%g,%g' % tuple(p) for p in s) + ']' for s in S)
with open(OUT, 'w') as f:
    f.write('// s16 desk front, measured on the clean plate by src/shots/s16/trace/desk.py (geometry only, frame px).\n')
    f.write('// PLANK outline; BASE the plank light on a grid (x from GX0 every 40, y from GY0 every 4);\n')
    f.write('// GRAIN dark grain lines, UNDER pale lines under the desk: flat [x, y, width, value, ...]; CUT cable crossings.\n')
    f.write('export const PLANK = %s;\n' % str(PLANK).replace(' ', ''))
    f.write('export const GX0 = %d, GY0 = %d, BASE = %s;\n' % (GX[0], GY[0], str(BASE).replace(' ', '')))
    f.write('export const GRAIN = [\n' + js_lines(GRAIN) + '];\n')
    f.write('export const UNDER = [\n' + js_lines(UNDER) + '];\n')
    f.write('export const CUT = [' + m16.js_rings(CUT, 1) + '];\n')
print('wrote', OUT, os.path.getsize(OUT) // 1024, 'KB')
# debug overlay
im = cv2.cvtColor((np.clip(E[0:946, 0:2206], 0, 1) * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
for S, col in ((GRAIN, (0, 0, 255)), (UNDER, (0, 255, 0))):
    for s in S:
        for i in range(1, len(s)): cv2.line(im, (int(s[i-1][0]), int(round(s[i-1][1]))), (int(s[i][0]), int(round(s[i][1]))), col, 1)
for r in CUT: cv2.polylines(im, [np.round(r).astype(np.int32)], True, (255, 128, 0), 1)
cv2.polylines(im, [np.round(np.array(PLANK)).astype(np.int32)], True, (0, 255, 255), 1)
cv2.imwrite(m16.ROOT + '/snapshots/s16-h1-work/desk_dbg.png', im[820:946])
