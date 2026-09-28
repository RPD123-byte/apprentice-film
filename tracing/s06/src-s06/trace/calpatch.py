#!/usr/bin/env python3
# calpatch.py render.png source.png patch.json T [gain] : per-frame value studies (mouth.json / owl_blink.json).
# Compares each level band of the frame shown at T (render vs source, inside the patch) and stores a correction per
# (layer, level) in patch.json["cal"] (running mean over calls); every frame's items are shifted by it on export.
import cv2, sys, json, numpy as np, os
sys.path.insert(0, os.path.dirname(__file__)); import grade
R = cv2.imread(sys.argv[1], 0).astype(np.float32); S = cv2.imread(sys.argv[2], 0).astype(np.float32)
P = sys.argv[3]; T = float(sys.argv[4]); gain = float(sys.argv[5]) if len(sys.argv) > 5 else 0.7
D = json.load(open(P)); H, W = R.shape
f = round(round(T * 25 + 1e-6) / 25, 2)
fr = next((x for x in D['frames'] if abs(x['t'] - f) < 1e-3), None)
if fr is None:   # a hold (mouth only)
    fr = {'mass': D['neutral'] if f < 27.6 else D['smile'], 't': f}
M = fr['mass']; cal = D.setdefault('cal', {})
hb = grade.halo_map(np.clip(S / 255, 0, 1)); vig = grade.vignette()
A = cv2.GaussianBlur(R, (0, 0), 1.0); B = cv2.GaussianBlur(S, (0, 0), 1.0)
for layer, items in M.items():
    masks = []
    for it in items:
        m = np.zeros((H, W), np.uint8)
        for ring in it['rings']:
            mm = np.zeros((H, W), np.uint8); cv2.fillPoly(mm, [np.round(np.array(ring) * 4).astype(np.int32)], 1, shift=2); m ^= mm
        masks.append(m.astype(bool))
    above = layer == 'ground'
    for i, it in enumerate(items):
        band = masks[i].copy()
        if i + 1 < len(masks): band &= ~masks[i + 1]
        if band.sum() < 15: continue
        v0 = it['v'] + cal.get(layer, {}).get(str(it['l']), [0, 0])[0]
        fh = 1 - (1 - v0) * (1 - 0.5 * hb[band]); sl = float(np.median((0.65 + 2.1 * fh * (1 - fh)) * (1 - 0.5 * hb[band]) * vig[band]))
        dv = -gain * float(np.median(A[band] - B[band])) / 255 / max(0.15, sl)
        c = cal.setdefault(layer, {}).setdefault(str(it['l']), [0.0, 0])
        c[0] = round(c[0] + dv / (1 + c[1] * 0.5), 4); c[1] += 1
        print(f'{layer} l={it["l"]}: dv {dv:+.3f} -> cal {c[0]:+.3f}')
json.dump(D, open(P, 'w'))
