#!/usr/bin/env python3
# Warp each flight frame of the SOURCE into the owl's own frame (owl units, root at the origin, bank removed) using the
# measured root track (ROOT in src/shots/s02.js: [t, x, y, px per unit, bank]); helper for measure_wings.py.
import cv2, numpy as np, re, os, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('ig', os.path.join(HERE, 'invgrade.py')); ig = importlib.util.module_from_spec(spec); spec.loader.exec_module(ig)
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
src = open(os.path.join(HERE, '..', '..', 's02.js')).read()
ROWS = [[float(v) for v in r.split(',')] for r in re.findall(r'\[([^\[\]]+)\]', re.search(r'const ROOT = \[(.*?)\];', src, re.S).group(1))]
def spline(t, k):
    T = ROWS
    if t <= T[0][0]: return T[0][k]
    if t >= T[-1][0]: return T[-1][k]
    i = 1
    while T[i][0] < t: i += 1
    p0, p1, p2, p3 = T[max(0, i - 2)], T[i - 1], T[i], T[min(len(T) - 1, i + 1)]
    u = (t - p1[0]) / (p2[0] - p1[0])
    return 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u * u + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u ** 3)
U0, U1, V0, V1 = -560, 560, -480, 320          # local window, owl units (1 px per unit)
cap = cv2.VideoCapture(V)
def local(f):
    t = f / 25
    cap.set(cv2.CAP_PROP_POS_FRAMES, f); ok, im = cap.read()
    P = ig.paint_of(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255, t)
    x, y, s, rot = spline(t, 1), spline(t, 2), spline(t, 3), spline(t, 4)
    c, sn = np.cos(rot), np.sin(rot)
    # frame = root + s*R(rot)*local ; local pixel (i,j) -> u = U0 + i, v = V0 + j
    M = np.array([[s * c, -s * sn, x + s * c * U0 - s * sn * V0], [s * sn, s * c, y + s * sn * U0 + s * c * V0]], np.float32)
    Lp = cv2.warpAffine(P, M, (U1 - U0, V1 - V0), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderValue=0)
    return Lp, (x, y, s, rot)
