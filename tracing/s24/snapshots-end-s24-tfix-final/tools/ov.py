# ov.py RDIR k1,k2,.. out.jpg [scale]  -> rows of render | source at viewing size
import sys, cv2, numpy as np
SRC = "/Users/computer/rootline/apprentice-film/snapshots/end-s24-tfix-src"
rd, ks, out = sys.argv[1], [int(x) for x in sys.argv[2].split(",")], sys.argv[3]
sc = float(sys.argv[4]) if len(sys.argv) > 4 else 0.42
W, H = int(2206 * sc), int(946 * sc)
rows = []
for k in ks:
    r = cv2.resize(cv2.imread(f"{rd}/k{k:02d}.png"), (W, H), interpolation=cv2.INTER_AREA)
    s = cv2.resize(cv2.imread(f"{SRC}/f{2420+k:04d}.png"), (W, H), interpolation=cv2.INTER_AREA)
    rows.append(np.hstack([r, np.full((H, 6, 3), 128, np.uint8), s]))
cv2.imwrite(out, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 88])
