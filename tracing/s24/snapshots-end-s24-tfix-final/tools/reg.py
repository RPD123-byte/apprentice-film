# reg.py k DIR1 [DIR2 ...] -- name:x0,y0,x1,y1 ... -> mean luminance per region (render dirs vs source)
import sys, cv2, numpy as np
SRC = "/Users/computer/rootline/apprentice-film/snapshots/end-s24-tfix-src"
k = int(sys.argv[1]); i = sys.argv.index("--"); dirs = sys.argv[2:i]; regs = sys.argv[i + 1:]
ims = [cv2.imread(f"{d}/k{k:02d}.png", 0).astype(np.float32) for d in dirs] + [cv2.imread(f"{SRC}/f{2420+k:04d}.png", 0).astype(np.float32)]
print(f"{'region':10s}", " ".join(f"{d[-8:]:>9s}" for d in dirs), "   source")
for r in regs:
    n, b = r.split(":"); x0, y0, x1, y1 = map(int, b.split(","))
    print(f"{n:10s}", " ".join(f"{im[y0:y1, x0:x1].mean():9.1f}" for im in ims))
