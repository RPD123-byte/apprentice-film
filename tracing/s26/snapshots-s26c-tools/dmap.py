#!/usr/bin/env python3
# dE map (sigma-8 blurred) between render DIR/rF.png and source F, as a heat image next to both frames.
import cv2, numpy as np, sys
d, F = sys.argv[1], int(sys.argv[2]); sig = float(sys.argv[3]) if len(sys.argv) > 3 else 8
SRC = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas/src'
r = cv2.imread(f'{d}/r{F}.png'); s = cv2.imread(f'{SRC}/{F}.png')
lab = lambda im: cv2.cvtColor(cv2.GaussianBlur(im.astype(np.float32) / 255, (0, 0), sig), cv2.COLOR_BGR2LAB)
dE = np.sqrt(((lab(r) - lab(s)) ** 2).sum(2))
hm = cv2.applyColorMap(np.clip(dE * 6, 0, 255).astype(np.uint8), cv2.COLORMAP_JET)
im = np.vstack([np.hstack([r, s]), np.hstack([hm, (0.5 * s + 0.5 * hm).astype(np.uint8)])])
cv2.imwrite(f'{d}/dmap{F}.jpg', cv2.resize(im, None, fx=0.45, fy=0.45, interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 85])
# coarse table: mean dE per 200px cell
H, W = dE.shape
print('mean', dE.mean().round(2))
for y in range(0, H, 200):
    print(' '.join(f'{dE[y:y+200, x:x+200].mean():5.1f}' for x in range(0, W, 200)))
