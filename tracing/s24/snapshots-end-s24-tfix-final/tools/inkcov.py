# inkcov.py RDIR k name:x0,y0,x1,y1 ...  -> fraction of pixels with fine dark marks (ink) in each region, render vs source
import sys, cv2, numpy as np
SRC = "/Users/computer/rootline/apprentice-film/snapshots/end-s24-tfix-src"
rd, k = sys.argv[1], int(sys.argv[2])
r = cv2.imread(f"{rd}/k{k:02d}.png", 0).astype(np.float32); s = cv2.imread(f"{SRC}/f{2420+k:04d}.png", 0).astype(np.float32)
def ink(im, th):
    bg = cv2.dilate(im, np.ones((7, 7))); return (bg - im) > th
for spec in sys.argv[3:]:
    n, b = spec.split(":"); x0, y0, x1, y1 = map(int, b.split(","))
    out = []
    for th in (15, 40, 90):
        out.append("t%d %.3f/%.3f" % (th, ink(r, th)[y0:y1, x0:x1].mean(), ink(s, th)[y0:y1, x0:x1].mean()))
    print(f"{n:8s}", "  ".join(out), "  (render/source)")
