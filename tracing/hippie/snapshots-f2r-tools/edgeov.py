# Overlay: source (grey) with the render's ink lines (red) and the source's ink lines (cyan), zoomed with a grid.
# Usage: edgeov.py render.png x0,y0,x1,y1 zoom out.jpg [step]
import sys, cv2, numpy as np
R = cv2.imread(sys.argv[1]); S = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/page-graded.png')
x0, y0, x1, y1 = [int(v) for v in sys.argv[2].split(',')]; z = float(sys.argv[3]); out = sys.argv[4]; st = int(sys.argv[5]) if len(sys.argv) > 5 else 20
r = R[y0:y1, x0:x1]; s = S[y0:y1, x0:x1]
def ink(im):
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32)
    bh = cv2.morphologyEx(g, cv2.MORPH_BLACKHAT, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    return bh > 28
g = cv2.cvtColor(cv2.cvtColor(s, cv2.COLOR_BGR2GRAY), cv2.COLOR_GRAY2BGR)
g = (g * 0.55 + 60).astype(np.uint8)
g[ink(s)] = (255, 255, 0)
g[ink(r)] = (0, 0, 255)
g = cv2.resize(g, None, fx=z, fy=z, interpolation=cv2.INTER_NEAREST)
H, W = g.shape[:2]
for x in range((x0 // st + 1) * st, x1, st):
    X = int((x - x0) * z); cv2.line(g, (X, 0), (X, H), (0, 160, 0), 1); cv2.putText(g, str(x), (X + 2, 12), 0, 0.38, (0, 255, 0), 1)
for y in range((y0 // st + 1) * st, y1, st):
    Y = int((y - y0) * z); cv2.line(g, (0, Y), (W, Y), (0, 160, 0), 1); cv2.putText(g, str(y), (2, Y - 2), 0, 0.38, (0, 255, 0), 1)
cv2.imwrite(out, g, [cv2.IMWRITE_JPEG_QUALITY, 90])
