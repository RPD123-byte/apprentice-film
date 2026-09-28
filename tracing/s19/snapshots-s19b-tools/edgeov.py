# edgeov.py out.jpg x0,y0,x1,y1 scale : overlay of edges, target (green) vs our room plate (magenta)
import sys; sys.path.insert(0, '.')
from lab import *
out = sys.argv[1]; x0, y0, x1, y1 = [int(v) for v in sys.argv[2].split(',')]; sc = float(sys.argv[3])
L = Lab(); R = cv2.cvtColor(L.dev('room', {'lit': False}), cv2.COLOR_BGR2GRAY); L.close()
T = (np.clip(np.load('../s19b-study/ungr_comp.npy'), 0, 1) * 255).astype(np.uint8)
er = cv2.Canny(cv2.GaussianBlur(R, (0, 0), 2.5), 30, 70); et = cv2.Canny(cv2.GaussianBlur(T, (0, 0), 2.5), 30, 70)
im = np.zeros((946, 2206, 3), np.uint8); im[..., 1] = et; im[..., 2] = er; im[..., 0] = er
im = cv2.addWeighted(im, 1, cv2.cvtColor(T // 3, cv2.COLOR_GRAY2BGR), 1, 0)
c = cv2.resize(im[y0:y1, x0:x1], None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA if sc < 1 else cv2.INTER_NEAREST)
cv2.imwrite(out, c)
