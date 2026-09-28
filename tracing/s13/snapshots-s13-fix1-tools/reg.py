# reg.py RENDERDIR FRAMES x0,y0,x1,y1 [x0,y0,x1,y1 ...] : region sigma-8 / sigma-3 MAE and signed mean (render - source)
import sys, numpy as np, cv2
from common import *
d, fr = sys.argv[1], sys.argv[2]
fs = [int(fr)] if '-' not in fr else list(range(int(fr.split('-')[0]), int(fr.split('-')[1]) + 1))
for b in sys.argv[3:]:
    x0, y0, x1, y1 = map(int, b.split(','))
    r8 = s8 = r3 = s3 = 0; out = []
    for f in fs:
        R = cv2.imread(f'{d}/r{f}.png', 0).astype(np.float32); S = src(f)
        for sg in (8, 3):
            a = cv2.GaussianBlur(R, (0, 0), sg)[y0:y1, x0:x1]; c = cv2.GaussianBlur(S, (0, 0), sg)[y0:y1, x0:x1]
            out.append((sg, np.abs(a - c).mean(), (a - c).mean()))
    m8 = np.mean([o[1] for o in out if o[0] == 8]); d8 = np.mean([o[2] for o in out if o[0] == 8]); m3 = np.mean([o[1] for o in out if o[0] == 3])
    print(f'{b:24s} s8 {m8:5.2f} ({d8:+5.2f})  s3 {m3:5.2f}')
