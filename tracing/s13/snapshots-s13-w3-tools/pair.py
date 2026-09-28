# pair.py OUT f [x0 y0 x1 y1] [--w W] -> OUT/p<f>.jpg : render | source | diff (render-source, grey=0)
import cv2, numpy as np, sys
out, f = sys.argv[1], int(sys.argv[2]); a = [x for x in sys.argv[3:] if not x.startswith('--')]
W = int(sys.argv[sys.argv.index('--w') + 1]) if '--w' in sys.argv else 2400
r = cv2.imread(f'{out}/r{f}.png', 0); s = cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s13-w3-src/f{f}.png', 0)
if len(a) >= 4:
    x0, y0, x1, y1 = map(int, a[:4]); r, s = r[y0:y1, x0:x1], s[y0:y1, x0:x1]
d = np.clip(128 + (r.astype(int) - s.astype(int)) * 2, 0, 255).astype(np.uint8)
im = np.hstack([r, s, d]); sc = W / im.shape[1]
im = cv2.resize(im, (W, int(im.shape[0] * sc)), interpolation=cv2.INTER_AREA)
tag = '' if len(a) < 4 else '-' + '_'.join(a[:4])
cv2.imwrite(f'{out}/p{f}{tag}.jpg', im, [cv2.IMWRITE_JPEG_QUALITY, 88]); print(f'{out}/p{f}{tag}.jpg')
