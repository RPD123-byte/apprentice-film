# roomc.py out.jpg x0,y0,x1,y1 [scale] [lit]: ungraded room plate vs ungraded source target (63.08, or the lit 57.34)
import sys; sys.path.insert(0, '.')
from lab import *
import numpy as np, cv2, time
out = sys.argv[1]; x0, y0, x1, y1 = [int(v) for v in sys.argv[2].split(',')]; sc = float(sys.argv[3]) if len(sys.argv) > 3 else 1
lit = len(sys.argv) > 4 and sys.argv[4] == 'lit'
L = Lab(); a = time.time(); im = L.dev('room', {'lit': lit}); L.close()
R = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
T = np.load('../s19b-study/ungr_lit.npy' if lit else '../s19b-study/ungr_comp.npy')
b = lambda x: cv2.GaussianBlur(x, (0, 0), 8)
print('blurred mae', round(float(np.abs(b(R) - b(T))[y0:y1, x0:x1].mean() * 255), 2), 'mean r/s', round(float(R[y0:y1, x0:x1].mean() * 255), 1), round(float(T[y0:y1, x0:x1].mean() * 255), 1))
c = np.hstack([R[y0:y1, x0:x1], np.ones((y1 - y0, 4)), T[y0:y1, x0:x1]])
c = (np.clip(c, 0, 1) * 255).astype(np.uint8)
if sc != 1: c = cv2.resize(c, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA if sc < 1 else cv2.INTER_CUBIC)
cv2.imwrite(out, c, [cv2.IMWRITE_JPEG_QUALITY, 90])
