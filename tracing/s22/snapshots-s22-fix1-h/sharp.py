# sharp.py DIR: gradient energy of render vs source in the edge owl footprint (single frames, cup-aligned crops)
import sys, re, cv2, numpy as np, glob
sys.path.insert(0, '.')
exec(open('edgecmp.py').read().split("d = sys.argv[1]")[0])
from run import src
d = sys.argv[1]
have = {int(re.search(r'r(\d+)\.png', p).group(1)) for p in glob.glob(f'{d}/r*.png')}
for side, rot, keys in [('top', 0, TOP), ('bot', 2, BOT)]:
    K = {round(t * 25): (x, y) for t, x, y in keys}
    Fs = sorted(F for F in have if F in K and ((1870 <= F <= 1913) if side == 'top' else (1938 <= F <= 1978)))
    Sm = cv2.imread(f'../s22-p4-meas/edge_{side}_med.png', 0).astype(np.float32)
    m = cv2.GaussianBlur(Sm, (0, 0), 8) > 120
    er, es, mae = [], [], []
    for F in Fs:
        a = cv2.cvtColor(crop_img(cv2.imread(f'{d}/r{F:04d}.png'), *K[F], rot), cv2.COLOR_BGR2GRAY)
        b = cv2.cvtColor(crop_img(src(F), *K[F], rot), cv2.COLOR_BGR2GRAY)
        # gradient at 1-frame-px scale on sigma 0.7 frame px (removes grain partly)
        g = lambda x: cv2.GaussianBlur(x, (0, 0), 2.8)
        ga, gb = g(a), g(b)
        e = lambda x: np.hypot(cv2.Sobel(x, cv2.CV_32F, 1, 0), cv2.Sobel(x, cv2.CV_32F, 0, 1))[m].mean()
        er.append(e(ga)); es.append(e(gb)); mae.append(np.abs(ga - gb)[m].mean())
    print(f'{d} {side} grad render {np.mean(er):.2f} source {np.mean(es):.2f}  single-frame MAE(s0.7) {np.mean(mae):.2f}')
