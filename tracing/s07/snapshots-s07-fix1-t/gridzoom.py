# gridzoom.py IMG x0 y0 x1 y1 scale out [step] : zoom with labelled grid
import cv2, sys
im = cv2.imread(sys.argv[1]); x0, y0, x1, y1 = map(int, sys.argv[2:6]); s = float(sys.argv[6]); out = sys.argv[7]; st = int(sys.argv[8]) if len(sys.argv) > 8 else 10
a = cv2.resize(im[y0:y1, x0:x1], None, fx=s, fy=s, interpolation=cv2.INTER_CUBIC)
for x in range(x0 - x0 % st + st, x1, st):
    X = int((x - x0) * s); cv2.line(a, (X, 0), (X, a.shape[0]), (0, 0, 255) if x % 50 == 0 else (0, 160, 255), 1)
    if x % 50 == 0: cv2.putText(a, str(x), (X + 2, 12), 0, 0.4, (0, 0, 255), 1)
for y in range(y0 - y0 % st + st, y1, st):
    Y = int((y - y0) * s); cv2.line(a, (0, Y), (a.shape[1], Y), (0, 0, 255) if y % 50 == 0 else (0, 160, 255), 1)
    if y % 50 == 0: cv2.putText(a, str(y), (2, Y - 2), 0, 0.4, (0, 0, 255), 1)
cv2.imwrite(out, a)
