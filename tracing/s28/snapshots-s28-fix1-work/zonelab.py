# zone mean Lab (render vs source) for frames in a dir. Usage: zonelab.py DIR "name:x0,y0,x1,y1;..."
import sys, cv2, numpy as np, glob, re
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s28d-tools')
from lib import src
d = sys.argv[1]; Z = [(z.split(':')[0], [int(v) for v in z.split(':')[1].split(',')]) for z in sys.argv[2].split(';')]
lab = lambda a: cv2.cvtColor(a, cv2.COLOR_BGR2LAB).astype(np.float32) * [100 / 255, 1, 1] - [0, 128, 128]
for p in sorted(glob.glob(d + '/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1))):
    t = float(re.search(r'at-([\d.]+)s', p).group(1)); r = lab(cv2.imread(p)); s = lab(src(t)); row = []
    for n, (x0, y0, x1, y1) in Z:
        a = r[y0:y1, x0:x1].reshape(-1, 3).mean(0); b = s[y0:y1, x0:x1].reshape(-1, 3).mean(0)
        row.append(f'{n}: dL {a[0]-b[0]:+5.1f} da {a[1]-b[1]:+4.1f} db {a[2]-b[2]:+4.1f}')
    print(f'{t:7.2f}  ' + ' | '.join(row))
