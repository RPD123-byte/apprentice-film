# litcmp.py RENDERDIR FRAME x0,y0,x1,y1 : lit-mask mismatch counts (blur 1, > 70) in a box
import sys, numpy as np, cv2
from common import *
d, f = sys.argv[1], int(sys.argv[2]); x0, y0, x1, y1 = map(int, sys.argv[3].split(','))
R = cv2.GaussianBlur(cv2.imread(f'{d}/r{f}.png', 0).astype(np.float32), (0, 0), 1)[y0:y1, x0:x1] > 70; S = cv2.GaussianBlur(src(f), (0, 0), 1)[y0:y1, x0:x1] > 70
print(f'{f}: render-only {(R & ~S).sum()}  source-only {(S & ~R).sum()}')
