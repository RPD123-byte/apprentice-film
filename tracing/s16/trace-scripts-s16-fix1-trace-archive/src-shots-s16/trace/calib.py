#!/usr/bin/env python3
# s16: tone calibration of the vector painter. The strokes' strengths are fitted with a linear model that ignores
# where strokes overlap (dense cross-hatching), which leaves the mid-tones a little light once the canvas composites
# them. This compares raw renders made by the film's own code (snapshots/s16-p2-tools/r.mjs ... raw) with the
# denoised pre-grade source, per tone level, and updates the level-value corrections in src/shots/s16/data/tonecal.js:
#   calib.py plate  <- snapshots/s16-p2-raw/r1175.png rendered with snapshots/s16-p2-tools/plate_test.js
#   calib.py dyn    <- snapshots/s16-p2-rawdyn/r{1152,1157,1175}.png rendered with the shot (per-frame drawings)
# Each run adds the measured bias (damped) to the stored table, so a couple of render/calibrate rounds converge.
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import tr, cv2, numpy as np
from trace_plate import CFG
OUT = '/Users/computer/rootline/apprentice-film/snapshots'
DATA = os.path.join(os.path.dirname(__file__), '..', 'data', 'tonecal.js')
M, W, H = 90, 2206, 946
K = CFG['K']; edges = [(k + 0.5) / K for k in range(K)]

def load():
    T = {'TONECAL': np.zeros(K + 1), 'TONECAL_DYN': np.zeros(K + 1)}
    if os.path.exists(DATA):
        for line in open(DATA):
            for name in T:
                if line.startswith('export const %s = [' % name):
                    T[name] = np.array([float(v) for v in line.split('[')[1].split(']')[0].split(',')])
    return T

def bias_of(pairs):
    """pairs: [(render, target, base_for_levels, mask)] -> per-level mean(render - target)"""
    acc = np.zeros(K + 1); cnt = np.zeros(K + 1)
    for r, y, base, m in pairs:
        idx = np.digitize(base, edges)
        rb = cv2.GaussianBlur(r, (0, 0), 2); yb = cv2.GaussianBlur(y, (0, 0), 2)
        for k in range(K + 1):
            sel = (idx == k) & m
            acc[k] += (rb[sel] - yb[sel]).sum(); cnt[k] += sel.sum()
    b = np.where(cnt > 300, acc / np.maximum(cnt, 1), 0)
    return np.convolve(np.pad(b, 1, mode='edge'), [0.25, 0.5, 0.25], 'valid')

def med(Y, k):
    return cv2.medianBlur((np.clip(Y, 0, 1) * 255).astype(np.uint8), k).astype(np.float32) / 255

mode = sys.argv[1] if len(sys.argv) > 1 else 'plate'
T = load()
if mode == 'plate':
    E = np.load(f'{OUT}/s16-p2-tools/plateE.npy')[M:M + H, M:M + W]
    Yd = tr.denoise(E, CFG['nlm'])
    r = cv2.imread(f'{OUT}/s16-p2-raw/r1175.png').astype(np.float32).mean(2) / 255
    m = np.ones(r.shape, bool); m[500:946, 100:780] = False; m[360:722, 680:910] = False; m[190:240, 1270:1550] = False
    b = bias_of([(r, Yd, med(Yd, CFG['med']), m)]); name = 'TONECAL'
else:
    pairs = []
    for f in (1152, 1157, 1175):
        Yd = tr.denoise(tr.pre(f), CFG['nlm'])
        r = cv2.imread(f'{OUT}/s16-p2-rawdyn/r{f}.png').astype(np.float32).mean(2) / 255
        m = np.load(f'{OUT}/s16-p2-tools/dynmask_{f}.npy') > 0
        if f == 1175:
            m = np.zeros(r.shape, bool); m[560:930, 160:700] = True        # the dazed owl (HOLD)
        m = cv2.erode(m.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
        pairs.append((r, Yd, med(Yd, CFG['med_dyn']), m))
    b = bias_of(pairs); name = 'TONECAL_DYN'
T[name] = T[name] + 0.8 * b
open(DATA, 'w').write("// s16 tone calibration (src/shots/s16/trace/calib.py): subtracted from a tone level's value, by level (0..%d);\n"
                      "// TONECAL for the plate (median-3 value study), TONECAL_DYN for the per-frame drawings (median 5)\n" % K +
                      ''.join('export const %s = [%s];\n' % (n, ','.join('%.4f' % v for v in T[n])) for n in ('TONECAL', 'TONECAL_DYN')))
print(name, 'bias now (1/255):', ' '.join('%+.1f' % (v * 255) for v in b))
