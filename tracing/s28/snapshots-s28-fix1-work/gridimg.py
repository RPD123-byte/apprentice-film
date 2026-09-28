# grid crop of any image (render frame) with frame-px labels. Usage: gridimg.py in.png out.jpg x0 y0 x1 y1 [scale] [step]
import cv2, sys
f = cv2.imread(sys.argv[1]); out = sys.argv[2]
x0, y0, x1, y1 = [int(v) for v in sys.argv[3:7]]
sc = float(sys.argv[7]) if len(sys.argv) > 7 else 2; step = int(sys.argv[8]) if len(sys.argv) > 8 else 50
H, W = f.shape[:2]
for x in range(0, W, step):
    cv2.line(f, (x, 0), (x, H), (0, 200, 255) if x % 500 else (0, 0, 255), 1); cv2.putText(f, str(x), (x + 2, y0 + 14), 0, 0.45, (0, 255, 255), 1)
for y in range(0, H, step):
    cv2.line(f, (0, y), (W, y), (0, 200, 255) if y % 500 else (0, 0, 255), 1); cv2.putText(f, str(y), (x0 + 2, y - 3), 0, 0.45, (0, 255, 255), 1)
f = cv2.resize(f[y0:y1, x0:x1], None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
cv2.imwrite(out, f, [cv2.IMWRITE_JPEG_QUALITY, 90])
