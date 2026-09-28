import cv2, numpy as np, sys, glob
d, k, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
f = sorted(glob.glob(d + '/frame-*.png'))[k]
a = cv2.imread(f, 0).astype(np.float32); b = cv2.imread(d + '/ref-%02d.png' % k, 0).astype(np.float32)
D = cv2.GaussianBlur(a, (0, 0), 8) - cv2.GaussianBlur(b, (0, 0), 8)
img = np.zeros(a.shape + (3,), np.float32); img[..., 2] = np.clip(D, 0, None) * 4; img[..., 0] = np.clip(-D, 0, None) * 4; img += (b * 0.25)[..., None]
img = np.clip(img, 0, 255).astype(np.uint8)
for x in range(0, a.shape[1], 200): cv2.line(img, (x, 0), (x, a.shape[0]), (0, 90, 0), 1); cv2.putText(img, str(x), (x + 2, 20), 0, 0.6, (0, 200, 0), 1)
for y in range(0, a.shape[0], 200): cv2.line(img, (0, y), (a.shape[1], y), (0, 90, 0), 1); cv2.putText(img, str(y), (2, y - 3), 0, 0.6, (0, 200, 0), 1)
cv2.imwrite(out, cv2.resize(img, (1103, 473)))
print('\n'.join(' '.join(f"{np.abs(D[y:y+200, x:x+200]).mean():5.1f}" for x in range(0, a.shape[1], 200)) for y in range(0, a.shape[0], 200)))
print('signed mean %.2f' % D.mean())
