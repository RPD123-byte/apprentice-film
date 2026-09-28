# grid8.py render.png T [cell] -- signed mean luminance error (render - source, blurred) per cell, and |err|
import sys, cv2, numpy as np
from lib import src
a = cv2.imread(sys.argv[1]).astype(np.float32); t = float(sys.argv[2]); c = int(sys.argv[3]) if len(sys.argv) > 3 else 100
b = src(t).astype(np.float32)
A = cv2.GaussianBlur(a, (0, 0), 6); B = cv2.GaussianBlur(b, (0, 0), 6)
d = A - B
print('signed L err (render-source) per %dpx cell; then |err| (RGB mean)' % c)
xs = range(0, 2206, c)
print('     ' + ''.join(f'{x:5d}' for x in xs))
for y in range(0, 946, c):
    print(f'{y:4d} ' + ''.join(f'{d[y:y+c, x:x+c].mean():5.0f}' for x in xs))
print()
for y in range(0, 946, c):
    print(f'{y:4d} ' + ''.join(f'{np.abs(d[y:y+c, x:x+c]).mean():5.0f}' for x in xs))
