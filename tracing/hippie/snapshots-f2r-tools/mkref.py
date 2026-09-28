# Owl-free reference of the colour page for MEASURING (not used by the film): the 117.4 s frame with the owl's
# corner replaced from 115.6 s (the owl is elsewhere then). Writes graded and pre-grade versions.
import cv2, numpy as np, sys
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from grade import frame, ungrade
D = '/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/'
a = frame(117.4); b = frame(115.6)
ua = ungrade(a, 117.4); ub = ungrade(b, 115.6)
m = np.zeros(a.shape[:2], np.float32)
cv2.rectangle(m, (1930, 40), (2130, 262), 1, -1)
m = cv2.GaussianBlur(m, (0, 0), 3)[..., None]
u = ua * (1 - m) + ub * m
g = a.astype(np.float32) * (1 - m) + b.astype(np.float32) * m
cv2.imwrite(D + 'page-graded.png', np.clip(g, 0, 255).astype(np.uint8))
cv2.imwrite(D + 'page-pre.png', np.clip(u * 255 + 0.5, 0, 255).astype(np.uint8))
print('ok')
