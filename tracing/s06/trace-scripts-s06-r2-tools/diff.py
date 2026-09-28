#!/usr/bin/env python3
# diff.py DIR IDX out.jpg [sigma] [x0 y0 x1 y1]: signed blurred difference (render - source): red = render brighter, blue = render darker
import cv2, sys, glob, numpy as np
d, idx, out = sys.argv[1], sys.argv[2], sys.argv[3]
sg = float(sys.argv[4]) if len(sys.argv) > 4 else 6
fr = cv2.imread(sorted(glob.glob(f'{d}/frame-{idx}-*.png'))[0], 0).astype(float)
rf = cv2.imread(sorted(glob.glob(f'{d}/ref-{idx}-*.png'))[0], 0).astype(float)
if len(sys.argv) > 8:
    x0, y0, x1, y1 = [int(v) for v in sys.argv[5:9]]
else:
    x0, y0, x1, y1 = 0, 0, fr.shape[1], fr.shape[0]
a = cv2.GaussianBlur(fr, (0, 0), sg)[y0:y1, x0:x1]; b = cv2.GaussianBlur(rf, (0, 0), sg)[y0:y1, x0:x1]
dd = a - b
m = np.clip(np.abs(dd) * float(__import__("os").environ.get("GAIN","4")), 0, 255).astype(np.uint8)
img = np.zeros(dd.shape + (3,), np.uint8)
img[..., 2] = np.where(dd > 0, m, 0); img[..., 0] = np.where(dd < 0, m, 0)
gray = (rf[y0:y1, x0:x1] * 0.35).astype(np.uint8)
img = cv2.add(img, cv2.merge([gray, gray, gray]))
# grid
for x in range((x0 // 100 + 1) * 100, x1, 100): cv2.line(img, (x - x0, 0), (x - x0, y1 - y0), (0, 90, 0), 1); cv2.putText(img, str(x), (x - x0 + 2, 12), 0, 0.4, (0, 255, 0), 1)
for y in range((y0 // 100 + 1) * 100, y1, 100): cv2.line(img, (0, y - y0), (x1 - x0, y - y0), (0, 90, 0), 1); cv2.putText(img, str(y), (2, y - y0 - 2), 0, 0.4, (0, 255, 0), 1)
cv2.imwrite(out, img, [cv2.IMWRITE_JPEG_QUALITY, 88])
print('mean abs', np.abs(dd).mean(), 'mean signed', dd.mean())
