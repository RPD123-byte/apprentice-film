# errmap.py REN_RECT SRC_RECT OUT : blurred (sigma 24 page units ~ 8 frame px) abs error map in page space + cell table
import sys, cv2, numpy as np
a = cv2.imread(sys.argv[1]).astype(np.float32); b = cv2.imread(sys.argv[2]).astype(np.float32)
bl = lambda x: cv2.GaussianBlur(x, (0, 0), 24)
e = np.abs(bl(a) - bl(b)).mean(2)
print('mean err', e.mean().round(2))
vis = np.clip(e * 4, 0, 255).astype(np.uint8)
vis = cv2.applyColorMap(vis, cv2.COLORMAP_JET)
cv2.imwrite(sys.argv[3], cv2.addWeighted(vis, 0.6, b.astype(np.uint8), 0.4, 0))
# cells of 100x100
rows = []
for y in range(0, 1000, 100):
  print(' '.join('%3d' % e[y:y+100, x:x+100].mean() for x in range(0, 1600, 100)))
# signed per channel mean diff per cell (ren - src), luminance
d = (bl(a) - bl(b)).mean(2)
print('signed')
for y in range(0, 1000, 100):
  print(' '.join('%+4d' % d[y:y+100, x:x+100].mean() for x in range(0, 1600, 100)))
