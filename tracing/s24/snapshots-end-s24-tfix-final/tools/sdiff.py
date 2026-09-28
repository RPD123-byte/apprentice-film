# sdiff.py RDIR k sigma out.jpg -> signed blurred difference (render - source): red = render brighter, blue = darker
import sys, cv2, numpy as np
SRC = "/Users/computer/rootline/apprentice-film/snapshots/end-s24-tfix-src"
rd, k, sg, out = sys.argv[1], int(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
r = cv2.imread(f"{rd}/k{k:02d}.png", 0).astype(np.float32); s = cv2.imread(f"{SRC}/f{2420+k:04d}.png", 0).astype(np.float32)
d = cv2.GaussianBlur(r, (0, 0), sg) - cv2.GaussianBlur(s, (0, 0), sg)
g = cv2.resize(s, None, fx=0.5, fy=0.5) * 0.35
d = cv2.resize(d, None, fx=0.5, fy=0.5)
img = np.dstack([g + np.clip(-d, 0, 255) * 4, g, g + np.clip(d, 0, 255) * 4])
cv2.imwrite(out, np.clip(img, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 88])
print("mean abs", np.abs(d).mean())
