# usage: gridcrop.py img.png x0 y0 x1 y1 out.jpg [scale] [step]  -> upscaled crop with labelled grid (frame coords)
import cv2, sys, numpy as np
im = cv2.imread(sys.argv[1]); x0, y0, x1, y1 = map(int, sys.argv[2:6]); out = sys.argv[6]
sc = float(sys.argv[7]) if len(sys.argv) > 7 else 3; st = int(sys.argv[8]) if len(sys.argv) > 8 else 20
c = cv2.resize(im[y0:y1, x0:x1], None, fx=sc, fy=sc, interpolation=cv2.INTER_NEAREST)
for x in range((x0 // st + 1) * st, x1, st):
    X = int((x - x0) * sc); cv2.line(c, (X, 0), (X, c.shape[0]), (0, 200, 255) if x % (st * 5) == 0 else (0, 110, 160), 1)
    cv2.putText(c, str(x), (X + 2, 12), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 255, 255), 1)
for y in range((y0 // st + 1) * st, y1, st):
    Y = int((y - y0) * sc); cv2.line(c, (0, Y), (c.shape[1], Y), (0, 200, 255) if y % (st * 5) == 0 else (0, 110, 160), 1)
    cv2.putText(c, str(y), (2, Y - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 255, 255), 1)
cv2.imwrite(out, c, [cv2.IMWRITE_JPEG_QUALITY, 92])
