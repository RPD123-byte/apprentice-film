# s28t: sheet of render | source pairs over time. Usage: sheet.py DIR T0 T1 STEP out.jpg [x0 y0 x1 y1] [--w PX]
import cv2, numpy as np, sys, glob, re
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s28t-tools')
from m import frame, SRC
D, t0, t1, st, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
rest = [a for a in sys.argv[6:] if not a.startswith('--')]
box = list(map(int, rest[:4])) if len(rest) >= 4 else [0, 0, 2206, 946]
w = int(sys.argv[sys.argv.index('--w') + 1]) if '--w' in sys.argv else 700
byk = {}
for p in glob.glob(D + '/frame-*.png'):
    t = float(re.search(r'at-([\d.]+)s', p).group(1)); tf = np.floor(t * 30 + 1e-6) / 30; byk[int(np.ceil(tf * 25 - 1e-6))] = p
rows = []
t = t0
while t <= t1 + 1e-6:
    k = round(t * 25)
    if k in byk:
        x0, y0, x1, y1 = box
        r = cv2.imread(byk[k])[y0:y1, x0:x1]; s = frame(SRC, k)[y0:y1, x0:x1]
        h = int(round(w * (y1 - y0) / (x1 - x0)))
        r = cv2.resize(r, (w, h), interpolation=cv2.INTER_AREA); s = cv2.resize(s, (w, h), interpolation=cv2.INTER_AREA)
        row = np.hstack([r, np.zeros((h, 6, 3), np.uint8), s])
        cv2.putText(row, f'{k/25:.2f}', (8, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
        rows.append(row); rows.append(np.zeros((4, row.shape[1], 3), np.uint8))
    t += st
cv2.imwrite(out, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 85])
