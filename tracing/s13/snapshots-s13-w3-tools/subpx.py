# subpx.py OUT f region... : best subpixel shift (render -> source) per region by brute force on sigma-1.5 MAE
import cv2, numpy as np, sys
out, f = sys.argv[1], int(sys.argv[2])
R = {'head': (900, 60, 1380, 470), 'cup': (1400, 30, 1580, 430), 'wing': (1720, 240, 2150, 700), 'wroot': (1470, 290, 1720, 720), 'feet': (1140, 850, 1600, 946),
     'chest': (960, 480, 1420, 820), 'tail': (1560, 640, 1860, 946), 'nub': (800, 270, 925, 470), 'crown': (930, 0, 1470, 200), 'lowL': (850, 380, 1090, 660), 'bandage': (920, 60, 1110, 190), 'bellyE': (1000, 540, 1300, 870), 'bellyR': (1300, 700, 1600, 880), 'chestM': (1000, 480, 1450, 800)}
keys = sys.argv[3:] or list(R)
import os
RNG = float(os.environ.get('RNG', 1.2)); STP = float(os.environ.get('STP', 0.15))
def sh(img, dx, dy): return cv2.warpAffine(img, np.float32([[1, 0, dx], [0, 1, dy]]), (img.shape[1], img.shape[0]), flags=cv2.INTER_CUBIC)
r = cv2.imread(f'{out}/r{f}.png', 0).astype(np.float32); s = cv2.GaussianBlur(cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s13-w3-src/f{f}.png', 0).astype(np.float32), (0, 0), 1.5)
PADN = 8
rp = cv2.copyMakeBorder(r, PADN, PADN, PADN, PADN, cv2.BORDER_REPLICATE)
for k in keys:
    x0, y0, x1, y1 = R[k]; best = None
    base = np.abs(cv2.GaussianBlur(r, (0, 0), 1.5)[y0:y1, x0:x1] - s[y0:y1, x0:x1]).mean()
    crop = rp[y0:y1 + 2 * PADN, x0:x1 + 2 * PADN]
    for dx in np.arange(-RNG, RNG + 0.01, STP):
        for dy in np.arange(-RNG, RNG + 0.01, STP):
            rr = cv2.GaussianBlur(sh(crop, dx, dy), (0, 0), 1.5)[PADN:-PADN, PADN:-PADN]
            m = np.abs(rr - s[y0:y1, x0:x1]).mean()
            if best is None or m < best[0]: best = (m, dx, dy)
    print(f'{f} {k:8s} base {base:.2f} best {best[0]:.2f} at ({best[1]:+.2f},{best[2]:+.2f})', flush=True)
