#!/usr/bin/env python3
# resid.py render.png source.png [gain] [--reset] : the tone correction of s06 (measurement only).
# Compares a render with the source blurred (6 px): where the render is too light a soft black veil darkens it, where
# too dark a soft white veil lightens it. The signed veil opacity s(x,y) accumulates over calls (out/resid_s.npy);
# its outlines at a few levels (painted nested, each band's opacity chosen so the stack gives the band's value) go to
# src/shots/s06/data/resid.js. The owl (drawn after this veil) is left out.
import cv2, numpy as np, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import grade
ROOT = os.path.abspath(os.path.join(HERE, '../../../..')); OUT = os.path.join(ROOT, 'snapshots/s06-r2-src/out')
R = cv2.imread(sys.argv[1], 0).astype(np.float32); S = cv2.imread(sys.argv[2], 0).astype(np.float32)
gain = float(sys.argv[3]) if len(sys.argv) > 3 and not sys.argv[3].startswith('--') else 0.7
H, W = R.shape
arg = lambda k, d=None: next((a.split('=', 1)[1] for a in sys.argv if a.startswith(k + '=')), d)
NAME = arg('--name', 'resid'); BOXES = [[int(v) for v in b.split(',')] for b in arg('--boxes', '').split(';') if b]
SP = os.path.join(OUT, NAME + '_s.npy')
s = np.zeros((H, W), np.float32) if ('--reset' in sys.argv or not os.path.exists(SP)) else np.load(SP)
E = cv2.GaussianBlur(R, (0, 0), 6) - cv2.GaussianBlur(S, (0, 0), 6)
post = np.clip(cv2.GaussianBlur(R, (0, 0), 3) / 255, 0, 1)
vr, hb = grade.ungrade(post)
f = 1 - (1 - vr) * (1 - 0.5 * hb)
slope = np.maximum(0.15, (0.65 + 2.1 * f * (1 - f)) * (1 - 0.5 * hb) * grade.vignette())
dpre = -gain * E / 255 / slope
dpre[np.abs(E) < 1.0] = 0
ds = np.where(dpre < 0, -dpre / np.maximum(0.15, vr), -dpre / np.maximum(0.15, 1 - vr))
mask = np.ones((H, W), np.uint8)
OWLP = [[1505,300],[1515,230],[1545,175],[1600,140],[1680,125],[1760,135],[1815,170],[1848,230],[1855,300],[1850,370],[1830,400],[1835,470],[1840,540],[1815,580],[1760,605],[1690,612],[1600,600],[1560,590],[1535,540],[1530,470],[1515,390],[1502,350]]
if '--owl' not in sys.argv: cv2.fillPoly(mask, [np.array(OWLP, np.int32)], 0)
if BOXES:   # a delta veil for one state, only inside these boxes (feathered)
    m2 = np.zeros((H, W), np.float32)
    for x0, y0, x1, y1 in BOXES: m2[y0:y1, x0:x1] = 1
    mask = (cv2.GaussianBlur(m2, (0, 0), 6) * mask).astype(np.float32)
ds = cv2.GaussianBlur(ds * mask, (0, 0), 3)
s = np.clip(s + ds, -0.6, 0.6); s = cv2.GaussianBlur(s, (0, 0), 2) * mask
np.save(SP, s)
LV = [0.02, 0.045, 0.075, 0.11, 0.15, 0.2, 0.26, 0.33, 0.42, 0.52]
def rings(m):
    cs, hier = cv2.findContours(m.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    for c in cs:
        if abs(cv2.contourArea(c)) < 60: continue
        a = cv2.approxPolyDP(c, 2.5, True)[:, 0, :]
        if len(a) >= 3: out.append([[int(p[0]), int(p[1])] for p in a])
    return out
res = {}
for name, field in (('dark', s), ('light', -s)):
    items = []; prev = 0.0
    for i, l in enumerate(LV):
        m = field > l
        if not m.any(): break
        hi = LV[i + 1] if i + 1 < len(LV) else 9
        band = m & (field <= hi)
        c = float(np.median(field[band])) if band.any() else l
        a = 1 - (1 - c) / (1 - prev); prev = c
        R_ = rings(m)
        if R_: items.append([round(a, 4)] + R_)
    res[name] = items
lines = ['// The tone correction of s06 (trace/resid.py): soft black / white veils whose opacity was MEASURED by comparing',
         '// renders with the source (blurred 6 px). Nested outlines, each [opacity, ring...]. No pixels are stored.']
for k, items in res.items():
    lines.append('export const %s = [' % k.upper())
    for it in items: lines.append('  [%g,%s],' % (it[0], ','.join('[' + ','.join('%d,%d' % (p[0], p[1]) for p in r) + ']' for r in it[1:])))
    lines.append('];')
p = os.path.join(ROOT, 'src/shots/s06/data/%s.js' % NAME); open(p, 'w').write('\n'.join(lines) + '\n')
print('resid: |E| %.2f  s range %.3f..%.3f  items dark %d light %d  -> %d KB' % (np.abs(E).mean(), s.min(), s.max(), len(res['dark']), len(res['light']), os.path.getsize(p) // 1024))
