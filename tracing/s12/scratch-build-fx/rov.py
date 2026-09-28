import json, sys, numpy as np, cv2
from rlib import *
# rov.py spec.json tracked.json outprefix [f0 f1] : overlays
spec = json.load(open(sys.argv[1])); tr = json.load(open(sys.argv[2])); pre = sys.argv[3]
fr = [f for f in range(spec['f'][0], spec['f'][1] + 1) if f not in HOLDS]
if len(sys.argv) > 5: fr = [f for f in fr if int(sys.argv[4]) <= f <= int(sys.argv[5])]
cols = [(0,255,0),(0,128,255),(255,0,255),(255,255,0),(0,255,255),(255,128,0),(128,255,128),(255,0,0),(0,0,255),(200,200,255)]
tiles = []
for f in fr:
    im = src(f, False)
    for i, k in enumerate(sorted(spec['faces'], key=lambda k: spec['faces'][k]['z'])):
        q = tr[k].get(str(f))
        if not q: continue
        c = cols[i % len(cols)]
        P = np.round(np.array(q)).astype(np.int32)
        cv2.polylines(im, [P], True, c, 3)
        cx, cy = np.clip(P.mean(0), [20, 30], [W - 120, H - 10]).astype(int)
        cv2.putText(im, k, (int(cx) - 20, int(cy)), 0, 1.0, c, 2)
    cv2.putText(im, str(f), (20, 40), 0, 1.3, (0, 255, 255), 3)
    tiles.append(cv2.resize(im, (1103, 473)))
for i in range(0, len(tiles), 6):
    t = tiles[i:i + 6]
    while len(t) % 2: t.append(np.zeros_like(t[0]))
    rows = [np.hstack(t[j:j + 2]) for j in range(0, len(t), 2)]
    cv2.imwrite(f'{pre}_{i // 6}.jpg', np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 80])
