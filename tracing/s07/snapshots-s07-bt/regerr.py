# regerr.py DIR x0 y0 x1 y1 [n0 n1] : mean sigma-8 abs and signed error in a box over frames
import sys, cv2, numpy as np
d = sys.argv[1]; x0, y0, x1, y1 = map(int, sys.argv[2:6]); n0 = int(sys.argv[6]) if len(sys.argv) > 6 else 727; n1 = int(sys.argv[7]) if len(sys.argv) > 7 else 763
bl = lambda x: cv2.GaussianBlur(x, (0, 0), 8)
ea = es = 0; k = 0
for n in range(n0, n1 + 1, 3):
  a = cv2.imread(f'{d}/r{n:04d}.png', 0).astype(np.float32); b = cv2.imread(f's07-bt/src/n{n:04d}.png', 0).astype(np.float32)
  e = (bl(a) - bl(b))[y0:y1, x0:x1]; ea += np.abs(e).mean(); es += e.mean(); k += 1
print('%s box abs %.2f signed %+.2f' % (d, ea / k, es / k))
