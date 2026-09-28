# keyboard luma percentiles in a box: kbstat.py DIR prefix F x0 y0 x1 y1
import cv2, numpy as np, sys
d, p, F = sys.argv[1], sys.argv[2], int(sys.argv[3]); x0, y0, x1, y1 = map(int, sys.argv[4:8])
im = cv2.imread(f'{d}/{p}{F}.png')[y0:y1, x0:x1]
L = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
print(d, F, 'p10/p50/p90', *np.percentile(L, [10, 50, 90]).round(0), 'mean BGR', im.reshape(-1, 3).mean(0).round(0))
