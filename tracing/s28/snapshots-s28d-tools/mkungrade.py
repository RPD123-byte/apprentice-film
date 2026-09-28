# pre-grade estimate of a source frame (for sampling colours): ungrade.py T out.png
import sys, cv2, numpy as np
from lib import src, ungrade, grade
t = float(sys.argv[1])
g = src(t).astype(np.float32) / 255
g = cv2.GaussianBlur(g, (0, 0), 1.2)
p = ungrade(g, t)
err = np.abs(grade(p, t) - g).mean() * 255
cv2.imwrite(sys.argv[2], np.clip(p * 255 + 0.5, 0, 255).astype(np.uint8))
print('residual', err)
