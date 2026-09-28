#!/usr/bin/env python3
# mouthline.py: the mouth line of s06 MEASURED on every source frame (measurement only): tracked column by column
# (x step 3 px) as the darkest point within +-8 px of the previous frame's line (extrapolated at the corners), kept
# where it is a clear dark ridge; per sample the centre y, the width (ink mass / peak of the cross profile) and the
# ungraded value at the centre and of the local ground. Holds (26.84-27.08, 28.40+) use the mean frames.
import cv2, numpy as np, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import grade
ROOT = os.path.abspath(os.path.join(HERE, '../../../..')); SRC = os.path.join(ROOT, 'snapshots/s06-r2-src'); OUT = os.path.join(SRC, 'out')
XS = np.arange(900, 1252, 3)
MN = [[950, 699], [985, 692], [1020, 685], [1045, 686], [1062, 690], [1080, 687], [1110, 683], [1145, 687], [1185, 694]]
def ungr(img):
    pre, hb = grade.ungrade(np.clip(img / 255, 0, 1))
    for _ in range(3): hb = grade.halo_map(pre); pre, _ = grade.ungrade(np.clip(img / 255, 0, 1), hb)
    return pre
def fit(img, pred, thr=38):
    g = cv2.GaussianBlur(img, (0, 0), 1.0)
    bg = cv2.GaussianBlur(cv2.dilate(g, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))), (0, 0), 2)
    pre = ungr(img); pg = cv2.GaussianBlur(pre, (0, 0), 1.0)
    pbg = cv2.GaussianBlur(cv2.dilate(pg, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))), (0, 0), 2)
    out = []
    for x, yp in zip(XS, pred):
        ys = np.arange(int(round(yp)) - 8, int(round(yp)) + 9)
        col = g[ys, x]; k = int(np.argmin(col)); y0 = ys[k]
        # sub-pixel centre (parabola)
        if 0 < k < len(ys) - 1:
            a, b, c = col[k - 1], col[k], col[k + 1]; d = a - 2 * b + c
            yc = y0 + (0.5 * (a - c) / d if d > 1e-3 else 0)
        else: yc = float(y0)
        dark = bg[y0, x] - col[k]
        prof = np.clip(pbg[y0 - 8:y0 + 9, x] - pg[y0 - 8:y0 + 9, x], 0, None); c0 = 8; pk = prof[c0]
        lo = c0
        while lo > 0 and prof[lo - 1] > 0.15 * pk and prof[lo - 1] <= prof[lo] + 0.03 * pk: lo -= 1
        hi = c0
        while hi < len(prof) - 1 and prof[hi + 1] > 0.15 * pk and prof[hi + 1] <= prof[hi] + 0.03 * pk: hi += 1
        w = float(prof[lo:hi + 1].sum() / max(pk, 1e-3))
        out.append([int(x), float(yc), w, float(pg[y0, x]), float(pbg[y0, x]), float(dark)])
    # keep the longest run of clear ridge samples
    ok = [o[5] > thr for o in out]
    best, cur, bs = (0, 0), 0, 0
    for i, v in enumerate(ok + [False]):
        if v: cur += 1
        else:
            if cur > best[1] - best[0]: best = (i - cur, i)
            cur = 0
    run = out[best[0]:best[1]]
    ys = np.array([o[1] for o in run]); ys_s = np.convolve(np.pad(ys, 2, mode='edge'), np.ones(5) / 5, 'valid')
    for o, y in zip(run, ys_s): o[1] = round(float(y), 2)
    return run
def predict(run):
    xs = np.array([o[0] for o in run]); ys = np.array([o[1] for o in run])
    pl = np.polyfit(xs[:6], ys[:6], 1); pr = np.polyfit(xs[-6:], ys[-6:], 1)
    return [float(np.interp(x, xs, ys)) if xs[0] <= x <= xs[-1] else float(np.polyval(pl if x < xs[0] else pr, x)) for x in XS]
fr = lambda i: cv2.imread(os.path.join(SRC, 'f%03d.png' % i), 0).astype(np.float32)
t_of = lambda i: round(26.72 + (i - 1) * 0.04, 2)
p0 = [float(np.interp(x, [p[0] for p in MN], [p[1] for p in MN])) for x in XS]
res = {'neutral': fit(np.load(os.path.join(SRC, 'neutral.npy')), p0), 'frames': []}
pred = predict(res['neutral'])
for i in range(1, 59):
    run = fit(fr(i), pred); res['frames'].append({'t': t_of(i), 'line': run}); pred = predict(run)
res['smile'] = fit(np.load(os.path.join(SRC, 'smile.npy')), pred)
json.dump(res, open(os.path.join(OUT, 'mouthline.json'), 'w'))
for f in res['frames'][::6]: print(f['t'], len(f['line']), f['line'][0][:2], f['line'][-1][:2])
print('smile', len(res['smile']), res['smile'][0][:2], res['smile'][-1][:2])
# debug sheet
rows = []
for f in res['frames'][::4]:
    i = int(round((f['t'] - 26.72) / 0.04)) + 1
    im = cv2.cvtColor(np.clip(fr(i), 0, 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)[610:760, 890:1260]
    for o in f['line']: cv2.circle(im, (int(o[0] - 890), int(round(o[1] - 610))), 1, (0, 0, 255), -1)
    cv2.putText(im, str(f['t']), (4, 14), 0, 0.45, (0, 200, 255), 1); rows.append(im)
cv2.imwrite(os.path.join(OUT, 'mouthline_dbg.png'), np.vstack(rows))
