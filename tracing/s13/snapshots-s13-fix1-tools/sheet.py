# sheet.py RENDERDIR out.jpg f1,f2,... : render | source pairs of exact frames, stacked (owl crop x 740-2140), half size
import sys, numpy as np, cv2
from common import *
d, out = sys.argv[1], sys.argv[2]; fs = [int(v) for v in sys.argv[3].split(',')]
rows = []
for f in fs:
    R = cv2.imread(f'{d}/r{f}.png'); S = cv2.imread(f'{SRC}/f{f}.png')
    c = lambda im: cv2.resize(im[:, 740:2140], (700, 473))
    row = np.hstack([c(R), np.full((473, 4, 3), (0, 0, 255), np.uint8), c(S)])
    cv2.putText(row, f'{f}  render | source', (8, 20), 0, 0.55, (0, 255, 255), 1); rows.append(row)
cv2.imwrite(out, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 88]); print(out)
