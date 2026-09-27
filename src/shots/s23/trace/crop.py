#!/usr/bin/env python3
# crop.py OUT.jpg x0 y0 x1 y1 scale img1 [img2 ...]  -> stacked crops (vertical); imgs may be r/p/src paths or 'S:k' (source) 'R:dir:k' (render)
import sys, cv2, numpy as np, os
SRC = os.path.dirname(os.path.abspath(__file__)) + '/src/%05d.png'
out = sys.argv[1]; x0, y0, x1, y1 = map(int, sys.argv[2:6]); sc = float(sys.argv[6])
ims = []
for a in sys.argv[7:]:
    if a.startswith('S:'): p = SRC % int(a[2:])
    elif a.startswith('R:'): d, k = a[2:].rsplit(':', 1); p = d + '/r%05d.png' % int(k)
    else: p = a
    im = cv2.imread(p)[y0:y1, x0:x1]
    im = cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA if sc < 1 else cv2.INTER_CUBIC)
    cv2.putText(im, os.path.basename(a), (4, 18), 0, 0.55, (0, 255, 255), 1)
    ims.append(im)
cols = int(os.environ.get('COLS', '1'))
while len(ims) % cols: ims.append(np.zeros_like(ims[0]))
rows = [np.hstack(ims[i:i + cols]) for i in range(0, len(ims), cols)]
cv2.imwrite(out, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 88])
