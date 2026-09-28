# dens.py RDIR k out.jpg -> fine-ink density maps (render | source), 12 px blur, with a 100 px grid (a measuring aid only)
import sys, cv2, numpy as np
SRC = "/Users/computer/rootline/apprentice-film/snapshots/end-s24-tfix-src"
rd, k, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
def dm(im):
    im = im.astype(np.float32); bg = cv2.dilate(im, np.ones((7, 7))); d = np.clip((bg - im - 15) / 80, 0, 1)
    d[cv2.GaussianBlur(im, (0, 0), 6) < 120] = 0   # only on the light (owl) areas
    return cv2.GaussianBlur(d, (0, 0), 12)
r = dm(cv2.imread(f"{rd}/k{k:02d}.png", 0)); s = dm(cv2.imread(f"{SRC}/f{2420+k:04d}.png", 0))
def vis(d):
    v = np.clip(d * 600, 0, 255).astype(np.uint8); c = cv2.applyColorMap(v, cv2.COLORMAP_INFERNO)
    for x in range(0, 2206, 100): cv2.line(c, (x, 0), (x, 946), (80, 80, 80), 1); cv2.putText(c, str(x), (x + 2, 14), 0, 0.45, (0, 255, 0), 1)
    for y in range(0, 946, 100): cv2.line(c, (0, y), (2206, y), (80, 80, 80), 1); cv2.putText(c, str(y), (2, y - 3), 0, 0.45, (0, 255, 0), 1)
    return cv2.resize(c, None, fx=0.5, fy=0.5)
cv2.imwrite(out, np.vstack([vis(r), vis(s)]), [cv2.IMWRITE_JPEG_QUALITY, 85])
