# de.py DIR_A DIR_B k0 k1 -> mean CIE76 dE on blurred Lab (sigma 4 / 12), as the end critic's metrics.py
import sys, cv2, numpy as np
SRC = "/Users/computer/rootline/apprentice-film/snapshots/end-s24-tfix-src"
A, B, k0, k1 = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
lab = lambda a: cv2.cvtColor((a / 255.).astype(np.float32), cv2.COLOR_BGR2Lab)
acc = {4: [0, 0], 12: [0, 0]}; n = 0
for k in range(k0, k1 + 1):
    if k in (55, 56): continue
    s = cv2.imread(f"{SRC}/f{2420+k:04d}.png").astype(np.float32)
    for j, d in enumerate((A, B)):
        r = cv2.imread(f"{d}/k{k:02d}.png").astype(np.float32)
        for sg in (4, 12):
            acc[sg][j] += np.linalg.norm(lab(cv2.GaussianBlur(r, (0, 0), sg)) - lab(cv2.GaussianBlur(s, (0, 0), sg)), axis=2).mean()
    n += 1
print(f"k{k0}-{k1} (n={n}): dE4 {acc[4][0]/n:.2f} -> {acc[4][1]/n:.2f}   dE12 {acc[12][0]/n:.2f} -> {acc[12][1]/n:.2f}")
