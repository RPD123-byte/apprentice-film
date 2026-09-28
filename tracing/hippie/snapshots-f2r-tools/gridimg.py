#!/usr/bin/env python3
# Crop an image, zoom it, and draw a labelled grid in the image's own pixel coordinates (for measuring).
# Usage: gridimg.py in.png out.jpg x0 y0 x1 y1 [zoom=2] [step=50] [--ov other.png alpha]
import cv2, sys
a = sys.argv
im = cv2.imread(a[1]); out = a[2]
x0, y0, x1, y1 = [int(v) for v in a[3:7]]
z = float(a[7]) if len(a) > 7 else 2.0
st = int(a[8]) if len(a) > 8 else 50
if '--ov' in a:
    i = a.index('--ov'); o = cv2.imread(a[i + 1]); al = float(a[i + 2])
    im = cv2.addWeighted(im, 1 - al, o, al, 0)
c = im[max(0, y0):y1, max(0, x0):x1]
c = cv2.resize(c, None, fx=z, fy=z, interpolation=cv2.INTER_CUBIC)
H, W = c.shape[:2]
for x in range((x0 // st) * st, x1 + 1, st):
    if x < x0: continue
    X = int((x - x0) * z)
    col = (0, 0, 255) if x % 100 == 0 else (0, 200, 255)
    cv2.line(c, (X, 0), (X, H), col, 1)
    cv2.putText(c, str(x), (X + 2, 12), 0, 0.4, (0, 255, 255), 1)
for y in range((y0 // st) * st, y1 + 1, st):
    if y < y0: continue
    Y = int((y - y0) * z)
    col = (0, 0, 255) if y % 100 == 0 else (0, 200, 255)
    cv2.line(c, (0, Y), (W, Y), col, 1)
    cv2.putText(c, str(y), (2, Y - 3), 0, 0.4, (0, 255, 255), 1)
cv2.imwrite(out, c, [cv2.IMWRITE_JPEG_QUALITY, 92])
