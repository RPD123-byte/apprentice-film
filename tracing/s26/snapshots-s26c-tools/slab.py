#!/usr/bin/env python3
# Beat E: the out-of-focus shard's mask per source frame: low saturation, low fine-detail energy (it is far out of
# focus), large connected region; fitted with a rotated rectangle (cv2.minAreaRect on the hull) where it is whole.
import cv2, numpy as np, json
M = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas'
out = {}; vis = []
for F in range(2841, 2856):
    s = cv2.imread(f'{M}/src/{F}.png'); H, W = s.shape[:2]
    hsv = cv2.cvtColor(cv2.GaussianBlur(s, (0, 0), 3), cv2.COLOR_BGR2HSV)
    g = cv2.cvtColor(s, cv2.COLOR_BGR2GRAY).astype(np.float32)
    hf = cv2.GaussianBlur(np.abs(g - cv2.GaussianBlur(g, (0, 0), 2)), (0, 0), 8)
    m = ((hsv[..., 1] < 70) & (hf < 3.2)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    n, lab, st, cen = cv2.connectedComponentsWithStats(m)
    if n < 2: continue
    i = 1 + np.argmax(st[1:, 4]); mk = (lab == i).astype(np.uint8)
    if st[i, 4] < 20000: continue
    cs, _ = cv2.findContours(mk, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea); hull = cv2.convexHull(c)
    rect = cv2.minAreaRect(hull)
    out[F] = {'area': int(st[i, 4]), 'rect': [list(rect[0]), list(rect[1]), rect[2]], 'hull': hull.reshape(-1, 2).tolist()}
    ov = s.copy(); ov[mk > 0] = (0.5 * ov[mk > 0] + [0, 0, 120]).astype(np.uint8)
    cv2.drawContours(ov, [np.int32(cv2.boxPoints(rect))], -1, (0, 255, 255), 3)
    cv2.putText(ov, str(F), (10, 60), 0, 2, (0, 255, 255), 3)
    vis.append(cv2.resize(ov, (551, 236)))
    print(F, st[i, 4], [round(v) for v in rect[0]], [round(v) for v in rect[1]], round(rect[2], 1))
json.dump(out, open(f'{M}/slab.json', 'w'))
while len(vis) % 3: vis.append(np.zeros_like(vis[0]))
cv2.imwrite(f'{M}/slab_masks.jpg', np.vstack([np.hstack(vis[i:i + 3]) for i in range(0, len(vis), 3)]))
