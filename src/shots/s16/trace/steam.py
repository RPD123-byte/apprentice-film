#!/usr/bin/env python3
# s16 steam: the two ribbons over the mug, measured per source frame as pale centre-lines (s12 method: Hessian ridge,
# hysteresis, skeleton, re-joined, smoothed, RDP; width at half the peak, the peak value). Frames under a camera
# (data/cams.js) are mapped back to plate px first, so the steam is drawn in the room's coordinates. Frames whose
# steam is unchanged share one drawing. Output: data/steam.js (geometry only).
import sys, os, re, json
sys.path.insert(0, os.path.dirname(__file__))
import m16, cv2, numpy as np

OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'steam.js')
X0, Y0, X1, Y1 = 700, 380, 900, 712           # the steam's box (plate px)
cams = {}
for m in re.finditer(r'(\d+): \[([^\]]+)\]', open(os.path.join(os.path.dirname(__file__), '..', 'data', 'cams.js')).read()):
    cams[int(m.group(1))] = [float(v) for v in m.group(2).split(',')]


def plateview(f):
    Y = m16.pre(f)
    if f in cams:
        a, b, tx, c, d, ty = cams[f]
        Y = cv2.warpAffine(Y, np.array([[a, b, tx], [c, d, ty]], np.float32), (m16.W, m16.H), flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP)
    return Y


E = m16.plateE(); M = m16.M
mug = E[M + Y0:M + Y1, M + X0:M + X1]
drawings, frame_of, prev = [], {}, None
WK = float(os.environ.get('WK', 0.8))
for f in range(1143, 1193):
    Y = plateview(f)[Y0:Y1, X0:X1].copy()
    # only what is above the mug and not the room: the mug's rim / the owl are masked by the plate / a brightness test
    mask = np.ones_like(Y, np.uint8)
    mask[(mug > 0.2)] = 0                                    # the mug itself (plate)
    mask[-30:, :] = 0
    big = cv2.GaussianBlur(Y, (0, 0), 6)
    mask[big > 0.35] = 0                                     # large bright areas: the owl flying over
    mask = cv2.erode(mask, np.ones((5, 5), np.uint8))
    if prev is not None and np.abs(cv2.GaussianBlur(Y, (0, 0), 1.2) - cv2.GaussianBlur(prev, (0, 0), 1.2))[mask > 0].max() < 0.12 and drawings:
        frame_of[f] = len(drawings) - 1; prev = Y; continue
    S = m16.strokes(Y, 'pale', mask=mask, sigmas=(0.9, 1.5), hi=0.05, lo=0.02, dmin=0.1, minlen=6, eps=0.5, smooth=5, win=9, off=(X0, Y0))
    for s in S:
        for p in s: p[2] = round(max(0.8, p[2] * WK), 1)
    drawings.append(S); frame_of[f] = len(drawings) - 1; prev = Y
    print(f, 'drawing', len(drawings) - 1, len(S), 'strokes', sum(len(s) for s in S), 'points')

with open(OUT, 'w') as fo:
    fo.write('// s16 steam, measured per source frame by src/shots/s16/trace/steam.py (geometry only, plate px):\n')
    fo.write('// DRAWINGS[i] = pale centre-lines [x, y, w, v, ...]; FRAME[n] = the drawing shown on source frame n.\n')
    fo.write('export const DRAWINGS = [\n' + ',\n'.join('[' + m16.js_strokes(S) + ']' for S in drawings) + '];\n')
    fo.write('export const FRAME = ' + json.dumps({str(k): v for k, v in frame_of.items()}).replace('"', '') + ';\n')
print('wrote', OUT, os.path.getsize(OUT) // 1024, 'KB,', len(drawings), 'drawings')
