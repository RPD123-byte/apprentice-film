# celview.py cel.json name x0 y0 x1 y1 zoom out.png [ref.png]  -- paint a cel trace (flat pre-grade values, no grade) beside the ref
import cv2, json, sys, numpy as np
d = json.load(open(sys.argv[1]))[sys.argv[2]]; x0, y0, x1, y1 = map(int, sys.argv[3:7]); z = float(sys.argv[7])
W, H = 2206, 946; S = 4
im = np.zeros((H * 1, W * 1), np.float32)
def fill(rings, v):
    m = np.zeros((H * S, W * S), np.uint8)
    for r in rings:
        p = (np.array(r).reshape(-1, 2) * S).astype(np.int32); t = np.zeros_like(m); cv2.fillPoly(t, [p], 1); m ^= t
    m = cv2.resize(m.astype(np.float32), (W, H), interpolation=cv2.INTER_AREA)
    im[:] = im * (1 - m) + v * m
fs = np.linspace(0, 1, 2001); Sf = 0.65 * fs + 0.35 * (3 * fs * fs - 2 * fs ** 3)
fill(d['region'], d['base'])
for L in d['levels']: fill(L['rings'], L['v'])
out = (np.interp(im, fs, Sf) * 255)[y0:y1, x0:x1]
ims = [out.astype(np.uint8)]
if len(sys.argv) > 9: ims += [np.full((y1 - y0, 3), 128, np.uint8), cv2.imread(sys.argv[9], 0)[y0:y1, x0:x1]]
o = np.hstack(ims); cv2.imwrite(sys.argv[8], cv2.resize(o, None, fx=z, fy=z, interpolation=cv2.INTER_CUBIC))
