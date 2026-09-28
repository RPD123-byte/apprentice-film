# sheet.py DIR out.jpg [w] -- all frames in DIR as (render | source) rows, small
import sys, glob, re, cv2, numpy as np
from lib import src
d = sys.argv[1]; w = int(sys.argv[3]) if len(sys.argv) > 3 else 700
rows = []
for f in sorted(glob.glob(d + '/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1))):
    t = float(re.search(r'at-([\d.]+)s', f).group(1))
    a = cv2.imread(f); b = src(t)
    h = int(946 * w / 2206)
    a = cv2.resize(a, (w, h), interpolation=cv2.INTER_AREA); b = cv2.resize(b, (w, h), interpolation=cv2.INTER_AREA)
    cv2.putText(a, f'{t:.2f}', (6, 22), 0, 0.7, (0, 255, 255), 2)
    rows.append(np.hstack([a, b]))
cv2.imwrite(sys.argv[2], np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 85])
