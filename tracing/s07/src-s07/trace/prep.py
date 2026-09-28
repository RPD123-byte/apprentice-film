#!/usr/bin/env python3
# s07 measurement prep (not loaded by the film). Extracts the source frames of the shot (29.04..30.52, 38 frames),
# measures each frame's exposure against the median (static regions), and writes to OUT (scratch):
#   frames/f_XX.png, gains.json, med.npy (flicker-normalised temporal median, 0..255 BGR),
#   T.npy (the median taken back through the inverse of src/lib/post.js: the pre-grade value the plate must paint).
import cv2, numpy as np, json, os, sys, subprocess
sys.path.insert(0, os.path.dirname(__file__))
from grade import inverse
SRC = "/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4"
OUT = sys.argv[1]
os.makedirs(OUT + "/frames", exist_ok=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "29.0", "-t", "1.6", "-i", SRC, "-vsync", "0", OUT + "/frames/r_%03d.png"], check=True)
raw = sorted(f for f in os.listdir(OUT + "/frames") if f.startswith("r_"))
# r_001 = 29.00 (s06); r_002 = 29.04 = first s07 frame ... r_039 = 30.52
fr = []
for i in range(38):
  im = cv2.imread(OUT + "/frames/" + raw[i + 1]); cv2.imwrite(OUT + "/frames/f_%02d.png" % i, im); fr.append(im.astype(np.float32))
for f in raw: os.remove(OUT + "/frames/" + f)
g = [cv2.cvtColor(i.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32) for i in fr]
mask = np.ones(g[0].shape, bool); mask[520:900, 560:1250] = False; mask[140:680, 290:930] = False
med0 = np.median(np.stack(g), axis=0)
sel = mask & (med0 > 30) & (med0 < 220)
gains = [float((x[sel] * med0[sel]).sum() / (med0[sel] ** 2).sum()) for x in g]
med = np.median(np.stack([f / k for f, k in zip(fr, gains)]), axis=0)
np.save(OUT + "/med.npy", med.astype(np.float32))
cv2.imwrite(OUT + "/med.png", np.clip(med, 0, 255).astype(np.uint8))
T = inverse(np.clip(med / 255, 0, 1), 29.6)
np.save(OUT + "/T.npy", T.astype(np.float32))
json.dump({"t0": 29.04, "dt": 0.04, "gains": gains, "tref": 29.6}, open(OUT + "/gains.json", "w"), indent=0)
print("gains", " ".join("%.4f" % v for v in gains))
