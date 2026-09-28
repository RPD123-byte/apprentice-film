# crop.py src.png x0 y0 x1 y1 scale out.jpg [grid step]
import cv2, sys
p, x0, y0, x1, y1, sc, out = sys.argv[1], *map(int, sys.argv[2:6]), float(sys.argv[6]), sys.argv[7]
st = int(sys.argv[8]) if len(sys.argv) > 8 else 0
im = cv2.imread(p)[y0:y1, x0:x1]
im = cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_NEAREST if sc >= 2 else cv2.INTER_AREA)
if st:
    for x in range((x0 // st + 1) * st, x1, st):
        X = int((x - x0) * sc); cv2.line(im, (X, 0), (X, im.shape[0]), (0, 0, 255) if x % (st*5) == 0 else (0, 0, 140), 1)
        if x % (st*2) == 0: cv2.putText(im, str(x), (X + 2, 12), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 255), 1)
    for y in range((y0 // st + 1) * st, y1, st):
        Y = int((y - y0) * sc); cv2.line(im, (0, Y), (im.shape[1], Y), (0, 0, 255) if y % (st*5) == 0 else (0, 0, 140), 1)
        if y % (st*2) == 0: cv2.putText(im, str(y), (2, Y - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 255), 1)
cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 92])
