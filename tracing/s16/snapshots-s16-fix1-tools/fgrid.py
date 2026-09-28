# fgrid.py n x0 y0 x1 y1 scale out [step]: source frame crop with a fine labelled grid (frame px)
import sys, cv2, numpy as np; sys.path.insert(0, '.')
import h16
n = int(sys.argv[1]); x0, y0, x1, y1 = map(int, sys.argv[2:6]); S = float(sys.argv[6]); out = sys.argv[7]; st = int(sys.argv[8]) if len(sys.argv) > 8 else 10
src = sys.argv[9] if len(sys.argv) > 9 else None
im = h16.src(n) if not src else cv2.imread(f'{src}/r{n}.png')
im = cv2.resize(im[y0:y1, x0:x1], None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
for x in range((x0 // st + 1) * st, x1, st):
    X = int((x - x0) * S); cv2.line(im, (X, 0), (X, im.shape[0]), (0, 160, 255) if x % 50 else (0, 0, 255), 1)
    if x % (2 * st) == 0: cv2.putText(im, str(x), (X + 2, 12), 0, 0.4, (0, 255, 255), 1)
for y in range((y0 // st + 1) * st, y1, st):
    Y = int((y - y0) * S); cv2.line(im, (0, Y), (im.shape[1], Y), (0, 160, 255) if y % 50 else (0, 0, 255), 1)
    if y % (2 * st) == 0: cv2.putText(im, str(y), (2, Y - 2), 0, 0.4, (0, 255, 255), 1)
cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 92])
