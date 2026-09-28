# diffmap.py OUT f [sigma] -> OUT/d<f>.jpg: blurred (render - source), grey = 0, x8 gain; red/blue colourised
import cv2, numpy as np, sys
out, f = sys.argv[1], int(sys.argv[2]); sg = float(sys.argv[3]) if len(sys.argv) > 3 else 8
r = cv2.imread(f'{out}/r{f}.png', 0).astype(np.float32); s = cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s13-w3-src/f{f}.png', 0).astype(np.float32)
d = cv2.GaussianBlur(r, (0, 0), sg) - cv2.GaussianBlur(s, (0, 0), sg)
g = np.clip(d * 8, -255, 255)
im = np.zeros(r.shape + (3,), np.uint8); base = (s * 0.35).astype(np.uint8)
im[..., 0] = np.clip(base + np.maximum(0, -g), 0, 255); im[..., 2] = np.clip(base + np.maximum(0, g), 0, 255); im[..., 1] = base
for x in range(0, 2206, 100): cv2.line(im, (x, 0), (x, 8), (0, 255, 0), 1); cv2.putText(im, str(x), (x + 2, 20), 0, 0.4, (0, 255, 0), 1)
for y in range(0, 946, 100): cv2.line(im, (0, y), (8, y), (0, 255, 0), 1); cv2.putText(im, str(y), (10, y + 4), 0, 0.4, (0, 255, 0), 1)
cv2.imwrite(f'{out}/d{f}.jpg', cv2.resize(im, (1654, 709), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 88]); print(f'{out}/d{f}.jpg  (red = render brighter, blue = darker)')
