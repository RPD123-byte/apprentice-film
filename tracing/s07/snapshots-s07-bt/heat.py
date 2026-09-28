# heat.py RENDER.png N out.jpg : block error maps (sigma8 abs err, and high-pass energy ratio) overlaid
import sys, cv2, numpy as np
a = cv2.imread(sys.argv[1], 0).astype(np.float32); n = int(sys.argv[2])
b = cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s07-bt/src/n{n:04d}.png', 0).astype(np.float32)
bl = lambda x, s: cv2.GaussianBlur(x, (0, 0), s)
e8 = np.abs(bl(a, 8) - bl(b, 8))
ha = np.abs(a - bl(a, 2)); hb = np.abs(b - bl(b, 2))
B = 40
rows = []
for y in range(0, 946 - B + 1, B):
  for x in range(0, 2206 - B + 1, B):
    rows.append((e8[y:y+B, x:x+B].mean(), bl(ha,1)[y:y+B, x:x+B].mean(), hb[y:y+B, x:x+B].mean(), x, y))
rows.sort(reverse=True)
for r in rows[:25]: print('err %.1f  hp render %.1f src %.1f  @ %d,%d' % r)
vis = cv2.cvtColor(b.astype(np.uint8), cv2.COLOR_GRAY2BGR)
hm = cv2.applyColorMap(np.clip(e8 * 12, 0, 255).astype(np.uint8), cv2.COLORMAP_JET)
cv2.imwrite(sys.argv[3], cv2.resize(cv2.addWeighted(vis, 0.5, hm, 0.5, 0), (1103, 473)))
