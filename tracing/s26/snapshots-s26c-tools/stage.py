#!/usr/bin/env python3
# The clean A-beat stage (source frames 2776-2787 median, camera ~still), with the traced cracks, the impact stars,
# the stuck scissors and the owl inpainted: a measurement reference for matching shard contents. Scratch only.
import cv2, numpy as np, json
M = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas'
fr = np.stack([cv2.imread(f'{M}/src/{F}.png') for F in range(2776, 2788)])
med = np.median(fr, 0).astype(np.uint8)
H, W = med.shape[:2]
d = json.load(open(f'{M}/cracksA.json'))
mask = np.zeros((H, W), np.uint8)
C = d['c']
for i in range(0, len(C), 4):
    cv2.line(mask, (int(C[i]), int(C[i+1])), (int(C[i+2]), int(C[i+3])), 255, 7)
for k in ('L', 'R'):
    P = np.array(d['s'][k], np.float32).reshape(-1, 2)
    c = P.mean(0); P2 = (P - c) * 1.45 + c
    cv2.fillPoly(mask, [P2.astype(np.int32)], 255)
# the owl and the stuck scissors (boxes measured on the median frame)
owl = np.fromfile('/Users/computer/rootline/apprentice-film/snapshots/s26b-meas/fit/m/2790.bin', np.uint8).reshape(473, 1103)
cv2.ellipse(mask, (1085, 600), (215, 330), 0, 0, 360, 255, -1)
for (x0, y0, x1, y1) in [(640, 380, 900, 600), (1270, 360, 1530, 580)]:
    cv2.rectangle(mask, (x0, y0), (x1, y1), 0, 0)
# bright thin lines left over (crack residue): a white top-hat
g = cv2.cvtColor(med, cv2.COLOR_BGR2GRAY)
th = cv2.morphologyEx(g, cv2.MORPH_TOPHAT, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
clean = cv2.inpaint(med, mask, 5, cv2.INPAINT_TELEA)
cv2.imwrite(f'{M}/stageA.png', clean); cv2.imwrite(f'{M}/stageA_mask.png', mask)
cv2.imwrite(f'{M}/stageA_view.jpg', cv2.resize(np.hstack([med, clean]), None, fx=0.4, fy=0.4))
print('ok', mask.mean() / 255)
