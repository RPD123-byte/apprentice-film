import pickle, numpy as np, cv2, sys
import ba
out = pickle.load(open(sys.argv[1], 'rb')); dst = sys.argv[2]
X, C = out['X'], out['C']
# camera coords (cam0 = world, y down)
S = 40; W0, H0 = 900, 900
im = np.zeros((H0, W0 * 2, 3), np.uint8)
def tp(x, z, ox): return (int(ox + W0 / 2 + x * S), int(H0 - 40 - z * S))
for x in X:
    c = int(np.clip(128 + x[1] * 60, 0, 255))
    cv2.circle(im, tp(x[0], x[2], 0), 3, (255 - c, 80, c), -1)
    cv2.circle(im, tp(x[1] * 1.0, x[2], W0), 3, (200, 200, 200), -1)   # side view: y vs z
for k, c in enumerate(C):
    cv2.circle(im, tp(c[0], c[2], 0), 5, (0, 255, 255), -1)
    cv2.circle(im, tp(c[1], c[2], W0), 5, (0, 255, 255), -1)
cv2.putText(im, 'top x-z', (10, 30), 0, 1, (255, 255, 255), 2); cv2.putText(im, 'side y(down)-z', (W0 + 10, 30), 0, 1, (255, 255, 255), 2)
cv2.imwrite(dst, im)
