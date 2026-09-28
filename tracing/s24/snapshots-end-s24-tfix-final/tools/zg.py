# zg.py K x0 y0 x1 y1 scale step out.jpg [render_dir]  -> source crop (and render crop beside it) with a labelled grid
import sys, cv2, numpy as np
SRC = "/Users/computer/rootline/apprentice-film/snapshots/end-s24-tfix-src"
k = int(sys.argv[1]); x0, y0, x1, y1 = map(int, sys.argv[2:6]); sc = float(sys.argv[6]); st = int(sys.argv[7]); out = sys.argv[8]
rd = sys.argv[9] if len(sys.argv) > 9 else None
def grid(im):
    c = cv2.resize(im[y0:y1, x0:x1], None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
    for x in range((x0 // st + 1) * st, x1, st):
        X = int((x - x0) * sc); cv2.line(c, (X, 0), (X, c.shape[0]), (0, 180, 255) if x % (st * 5) else (0, 0, 255), 1)
        cv2.putText(c, str(x), (X + 2, 12), 0, 0.4, (0, 255, 255), 1)
    for y in range((y0 // st + 1) * st, y1, st):
        Y = int((y - y0) * sc); cv2.line(c, (0, Y), (c.shape[1], Y), (0, 180, 255) if y % (st * 5) else (0, 0, 255), 1)
        cv2.putText(c, str(y), (2, Y - 2), 0, 0.4, (0, 255, 255), 1)
    return c
s = cv2.imread(f"{SRC}/f{2420+k:04d}.png")
imgs = [grid(s)]
if rd: imgs.insert(0, grid(cv2.imread(f"{rd}/k{k:02d}.png")))
cv2.imwrite(out, np.hstack(imgs) if len(imgs) > 1 else imgs[0], [cv2.IMWRITE_JPEG_QUALITY, 88])
