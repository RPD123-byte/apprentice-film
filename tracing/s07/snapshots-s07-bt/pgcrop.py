# pgcrop.py TAG x0 y0 x1 y1 out [v] : rectified render (snapshots/s07-bp/TAG/rect.png) | source mean crop
import sys, cv2, numpy as np
a = cv2.imread(f'snapshots/s07-bp/{sys.argv[1]}/rect.png'); b = cv2.imread('snapshots/s07-bt/src_screen_mean.png')
x0, y0, x1, y1 = map(int, sys.argv[2:6])
f = np.vstack if len(sys.argv) > 7 else np.hstack
cv2.imwrite(sys.argv[6], f([a[y0:y1, x0:x1], b[y0:y1, x0:x1]]))
