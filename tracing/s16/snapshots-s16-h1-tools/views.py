import sys, cv2, numpy as np; sys.path.insert(0, '.')
from lab import Lab
import h16
S = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad'
n = int(sys.argv[1]); box = [int(v) for v in sys.argv[2].split(',')]; views = sys.argv[3].split(',')
L = Lab(); ims = []
x0, y0, x1, y1 = box
for v in views:
    L.js('(v) => S16H.set({view: v})', v)
    ims.append(h16.grade(L.raw(n), n)[y0:y1, x0:x1])
ims.append(h16.src(n)[y0:y1, x0:x1].astype(np.float32))
cv2.imwrite(f'{S}/views{n}.jpg', np.clip(np.hstack(ims), 0, 255).astype(np.uint8))
L.close()
