# Measuring reference for the strip: the source frames 89–96 s (median) warped into colour-page coordinates,
# x -440..2620, y 60..390 (offset +440, -60). Measurement only.
import sys, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/f2r-tools')
from grade import frame, ungrade
ax, bx, ay, by = 0.5887, 444.8, 0.5829, 142.4   # colour -> frame (median fit)
X0, Y0, W, H = -440, 60, 3060, 330
M = np.float32([[ax, 0, bx + ax * X0], [0, ay, by + ay * Y0]])
fs = []
for t in (88.8, 89.2, 89.6, 90.0, 90.4, 91.0, 92.0):
    f = ungrade(frame(t), t)
    fs.append(cv2.warpAffine(f, M, (W, H), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP))
med = np.median(np.stack(fs), axis=0)
cv2.imwrite('/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/strip-pre.png', np.clip(med * 255 + 0.5, 0, 255).astype(np.uint8))
print('ok')
