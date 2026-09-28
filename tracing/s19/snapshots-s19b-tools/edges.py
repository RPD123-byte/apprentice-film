# edges.py which x0,y0,x1,y1 scale step out.jpg : boosted un-graded target with a grid (for reading outlines)
import sys, numpy as np, cv2
w = sys.argv[1]; x0, y0, x1, y1 = [int(v) for v in sys.argv[2].split(',')]; sc = float(sys.argv[3]); step = int(sys.argv[4]); out = sys.argv[5]
T = np.load(f'../s19b-study/ungr_{w}.npy')[y0:y1, x0:x1]
g = np.clip(np.sqrt(T) * 255, 0, 255).astype(np.uint8)
c = cv2.cvtColor(g, cv2.COLOR_GRAY2BGR); c = cv2.resize(c, None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
for x in range((x0 // step + 1) * step, x1, step):
    X = int((x - x0) * sc); cv2.line(c, (X, 0), (X, 8), (0, 255, 255), 1); cv2.line(c, (X, c.shape[0] - 8), (X, c.shape[0]), (0, 255, 255), 1)
    if x % (step * 2) == 0: cv2.putText(c, str(x), (X + 2, 20), 0, 0.4, (0, 255, 255), 1)
for y in range((y0 // step + 1) * step, y1, step):
    Y = int((y - y0) * sc); cv2.line(c, (0, Y), (8, Y), (0, 255, 255), 1); cv2.line(c, (c.shape[1] - 8, Y), (c.shape[1], Y), (0, 255, 255), 1)
    if y % (step * 2) == 0: cv2.putText(c, str(y), (10, Y + 4), 0, 0.4, (0, 255, 255), 1)
# faint dotted grid
for x in range((x0 // step + 1) * step, x1, step):
    X = int((x - x0) * sc); c[::6, X] = (0, 90, 160)
for y in range((y0 // step + 1) * step, y1, step):
    Y = int((y - y0) * sc); c[Y, ::6] = (0, 90, 160)
cv2.imwrite(out, c, [cv2.IMWRITE_JPEG_QUALITY, 90])
