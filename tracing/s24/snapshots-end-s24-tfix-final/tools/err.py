# err.py RENDER_DIR k1,k2,... [x0 y0 x1 y1] -> mean abs diff (RGB) after gaussian blur sigma 4 and 12, plus sigma1 luma
import sys, cv2, numpy as np
SRC = "/Users/computer/rootline/apprentice-film/snapshots/end-s24-tfix-src"
rd = sys.argv[1]; ks = [int(x) for x in sys.argv[2].split(",")]
box = list(map(int, sys.argv[3:7])) if len(sys.argv) >= 7 else [0, 0, 2206, 946]
x0, y0, x1, y1 = box
tot = np.zeros(3)
for k in ks:
    r = cv2.imread(f"{rd}/k{k:02d}.png").astype(np.float32); s = cv2.imread(f"{SRC}/f{2420+k:04d}.png").astype(np.float32)
    res = []
    for sg in (1, 4, 12):
        a = cv2.GaussianBlur(r, (0, 0), sg); b = cv2.GaussianBlur(s, (0, 0), sg)
        res.append(np.abs(a - b)[y0:y1, x0:x1].mean())
    tot += res
    print(f"k{k}: s1 {res[0]:.2f}  s4 {res[1]:.2f}  s12 {res[2]:.2f}")
print(f"mean: s1 {tot[0]/len(ks):.2f}  s4 {tot[1]/len(ks):.2f}  s12 {tot[2]/len(ks):.2f}")
