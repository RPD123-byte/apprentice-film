#!/usr/bin/env python3
# mline_fit.py: calibrate the per-frame mouth line's drawing (face2.js MLINE) against the source (measurement only).
# A numpy model of drawMouthLine() draws the NEUTRAL and SMILE lines of data/mouth.js over the r3 mouth layers' own
# renders (snapshots/s06-r3-out/mouth*_layer.npy) and a coordinate search picks the MLINE numbers that best match the
# flicker-corrected ungraded source means in a band round the line. Prints the MLINE object.
import sys, os, json, itertools
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np, cv2, jsdata
from raster import catmull, taper_poly, coverage
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
SRC = os.path.join(ROOT, 'snapshots/s06-r2-src'); OUT = os.path.join(ROOT, 'snapshots/s06-r3-out')
CASES = []
def load_cases():
    M = jsdata.load('mouth')
    CASES[:] = [(M['NEUTRAL']['line'], np.load(os.path.join(SRC, 'neutral_pre3.npy')), np.load(os.path.join(OUT, 'mouth_layer.npy'))),
                (M['SMILE']['line'], np.load(os.path.join(SRC, 'smile_pre3.npy')), np.load(os.path.join(OUT, 'mouth_s_layer.npy')))]


def draw_line(C, s, P, off):
    A = np.asarray(s, np.float64).reshape(-1, 5); n = len(A)
    vmin = A[:, 3].min(); bm = A[:, 4].mean()
    vd = max(0.0, bm - (bm - vmin) * P['sharpen'])
    w = np.minimum(P['cap'], A[:, 2] * P['gain'] * np.maximum(0, A[:, 4] - A[:, 3]) / np.maximum(0.05, A[:, 4] - vd))
    q = catmull(A[:, :2], 3); S = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(q, axis=0).T))]); Lt = S[-1]
    a = np.minimum(1, np.minimum(S / P['taper'], (Lt - S) / P['taper']))
    env = np.where(a <= 0, 0, np.sqrt(np.maximum(0, a * a * (3 - 2 * a))))
    f = np.arange(len(q)) / (len(q) - 1) * (n - 1); ia = np.floor(f).astype(int); ib = np.minimum(n - 1, ia + 1)
    wq = (w[ia] + (w[ib] - w[ia]) * (f - ia)) * env
    t = q[np.minimum(len(q) - 1, np.arange(len(q)) + 1)] - q[np.maximum(0, np.arange(len(q)) - 1)]
    l = np.hypot(t[:, 0], t[:, 1]); l[l == 0] = 1
    offn = wq / 2 + 0.7
    up = np.stack([q[:, 0] + t[:, 1] / l * offn, q[:, 1] - t[:, 0] / l * offn], 1)
    for pts, wv, tone in ((up, P['edgeW'] * env, P['edgeV']), (q, wq, vd)):
        cov = coverage([taper_poly(pts, wv)], C.shape, off)
        if P['soft']: cov = cv2.GaussianBlur(cov, (0, 0), P['soft'])
        tone = round(tone * 255) / 255
        C[:] = C * (1 - cov) + tone * cov
    return C


def score(P, show=None):
    tot = 0
    for k, (s, T, B) in enumerate(CASES):
        A = np.asarray(s).reshape(-1, 5)
        x0, y0 = int(A[:, 0].min()) - 20, int(A[:, 1].min()) - 20; x1, y1 = int(A[:, 0].max()) + 20, int(A[:, 1].max()) + 20
        C = B[y0:y1, x0:x1].copy(); draw_line(C, s, P, (x0, y0))
        band = np.zeros(C.shape, np.uint8)
        cv2.polylines(band, [np.round((A[:, :2] - [x0, y0]) * 8).astype(np.int32)], False, 1, 16, shift=3)
        e = np.abs(cv2.GaussianBlur(C, (0, 0), 1.0) - cv2.GaussianBlur(T[y0:y1, x0:x1], (0, 0), 1.0))[band > 0].mean() * 255
        tot += e
        if show:
            im = np.hstack([C, T[y0:y1, x0:x1]]); cv2.imwrite(show + f'-{k}.png', cv2.resize((np.clip(im, 0, 1) * 255).astype(np.uint8), None, fx=3, fy=3))
    return tot / len(CASES)


if __name__ == '__main__':
    load_cases()
    P = dict(cap=5, taper=8, sharpen=1.35, gain=0.85, edgeV=0.5, edgeW=1.0, soft=0.45)
    print('start', round(score(P, os.path.join(ROOT, 'snapshots/s06-r3-line/start')), 3), P)
    steps = dict(cap=[3, 3.5, 4, 4.5, 5, 6], taper=[6, 8, 11, 14, 18, 24], sharpen=[1.0, 1.15, 1.35, 1.6, 1.9], gain=[0.6, 0.7, 0.8, 0.9, 1.0, 1.1],
                 edgeV=[0.5, 0.7, 0.9, 1.0], edgeW=[0.3, 0.6, 1.0], soft=[0.3, 0.45, 0.6])
    best = score(P)
    for rnd in range(3):
        for k, vals in steps.items():
            for v in vals:
                Q = dict(P); Q[k] = v; e = score(Q)
                if e < best - 1e-4: best, P = e, Q
        print('round', rnd, round(best, 3), P)
    score(P, os.path.join(ROOT, 'snapshots/s06-r3-line/best'))
    print('MLINE =', json.dumps(P))
    json.dump(P, open(os.path.join(OUT, 'mline.json'), 'w'))
