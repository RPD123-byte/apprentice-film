# facestat.py DIR side: face stats (cup-local), render vs single source frames, for frames of that side in DIR
import sys, glob, re, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s22-fix1-h')
from singles import cupat, crop
from run import src
d = sys.argv[1]; side = int(sys.argv[2])
box = [18, 2, 48, 32]; S = 8
def at(a, u, v): i = int(round((u - box[0] + 0.5) * S - 0.5)); j = int(round((v - box[1] + 0.5) * S - 0.5)); return a[j - 3:j + 4, i - 3:i + 4].mean()
CREASE = [(31.7, 2.3), (33, 4.2), (34, 6.2), (34.9, 8.3), (35.5, 10.4), (36, 12.5)]
rows = []; maes = []
for p in sorted(glob.glob(f'{d}/r*.png')):
    F = int(re.search(r'r(\d+)\.png', p).group(1)); c = cupat(F)
    if c is None or c[0] != side or F / 25 > 79.76: continue
    s, cx, cy = c
    out = []; faces = []
    for im in (cv2.imread(p), src(F)):
        a = cv2.cvtColor(crop(im, cx, cy, s, box, S).clip(0, 255).astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(float)
        cr = np.mean([at(a, u, v) for u, v in CREASE])
        wedge = a[(13 - 2) * S:(24 - 2) * S, (26 - 18) * S:(38 - 18) * S]
        white = np.mean([at(a, 23, 28), at(a, 44, 12), at(a, 22, 8)])
        out += [cr, wedge.mean(), np.percentile(wedge, 10), white]
        rel = cv2.GaussianBlur(a, (0, 0), 12) - white
        faces.append(rel[(4 - 2) * S:(28 - 2) * S, (22 - 18) * S:(44 - 18) * S])
    rows.append(out); maes.append(np.abs(faces[0] - faces[1]).mean())
    print(F, 'crease r/s %.0f/%.0f  wedge mean r/s %.0f/%.0f  p10 %.0f/%.0f  white %.0f/%.0f' % (out[0], out[4], out[1], out[5], out[2], out[6], out[3], out[7]))
m = np.mean(rows, 0)
print('face rel MAE %.1f' % np.mean(maes)); print('mean crease r/s %.0f/%.0f  wedge mean r/s %.0f/%.0f  p10 %.0f/%.0f  white %.0f/%.0f' % (m[0], m[4], m[1], m[5], m[2], m[6], m[3], m[7]))
