import cv2, glob, re, sys, numpy as np
d = sys.argv[1]
R = {'all': (0, 0, 2206, 946), 'face': (740, 90, 1360, 820), 'mouth': (890, 605, 1270, 775), 'brows': (780, 170, 1340, 270), 'owl': (1500, 120, 1850, 600), 'owleye': (1570, 300, 1770, 385), 'hood': (0, 480, 560, 946), 'bgR': (1850, 0, 2206, 946)}
tot = {k: [] for k in R}
for f in sorted(glob.glob(d + '/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1))):
    idx = re.search(r'frame-(\d+)', f).group(1); t = re.search(r'at-([\d.]+)s', f).group(1)
    a = cv2.imread(f, 0).astype(float); b = cv2.imread(glob.glob(f'{d}/ref-{idx}-*.png')[0], 0).astype(float)
    ab = cv2.GaussianBlur(a, (0, 0), 5); bb = cv2.GaussianBlur(b, (0, 0), 5)
    vals = {k: np.abs(ab[y0:y1, x0:x1] - bb[y0:y1, x0:x1]).mean() for k, (x0, y0, x1, y1) in R.items()}
    if vals['all'] > 40: print(t, 'skip (cut / tool grid)'); continue
    for k in R: tot[k].append(vals[k])
    print(t, ' '.join(f'{k}={v:5.1f}' for k, v in vals.items()))
print('mean', ' '.join(f'{k}={np.mean(v):5.2f}' for k, v in tot.items()))
