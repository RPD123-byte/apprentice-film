# s28t: crop render | source (| film) at full res. Usage: crop.py DIR T x0 y0 x1 y1 out.jpg [--film] [--scale S]
import cv2, numpy as np, sys, glob, re
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s28t-tools')
from m import frame, SRC, FILM
D, T = sys.argv[1], float(sys.argv[2]); x0, y0, x1, y1 = map(int, sys.argv[3:7]); out = sys.argv[7]
k = round(T * 25)
fs = glob.glob(D + '/frame-*.png'); best = None
for p in fs:
    t = float(re.search(r'at-([\d.]+)s', p).group(1)); tf = np.floor(t * 30 + 1e-6) / 30
    if int(np.ceil(tf * 25 - 1e-6)) == k: best = p
assert best, k
r = cv2.imread(best)[y0:y1, x0:x1]; s = frame(SRC, k)[y0:y1, x0:x1]
tiles = [r, s] + ([frame(FILM, k)[y0:y1, x0:x1]] if '--film' in sys.argv else [])
horiz = (x1 - x0) < (y1 - y0) * 1.3
img = np.hstack(tiles) if horiz else np.vstack(tiles)
sc = float(sys.argv[sys.argv.index('--scale') + 1]) if '--scale' in sys.argv else 1.0
if sc != 1: img = cv2.resize(img, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA)
cv2.imwrite(out, img, [cv2.IMWRITE_JPEG_QUALITY, 90])
