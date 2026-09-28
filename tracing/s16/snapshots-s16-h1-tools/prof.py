import sys, json, cv2, numpy as np; sys.path.insert(0, '.')
from lab import Lab
import h16
n = int(sys.argv[1]); x0, x1 = int(sys.argv[2]), int(sys.argv[3]); y0, y1 = int(sys.argv[4]), int(sys.argv[5])
L = Lab(); R = cv2.cvtColor(L.raw(n), cv2.COLOR_BGR2GRAY).astype(np.float32) / 255; L.close()
Y = h16.pre(n)
for y in range(y0, y1):
    print(y, 'src %.2f ren %.2f' % (Y[y, x0:x1].mean(), R[y, x0:x1].mean()))
