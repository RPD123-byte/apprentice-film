# cmp.py DIR [--crop x0,y0,x1,y1] [--stack]  -> DIR/cmp-T.jpg (render over source) and metrics per frame
import sys, glob, re, cv2, numpy as np
from lib import src, blurdiff
d = sys.argv[1]; opts = dict(zip(sys.argv[2::2], sys.argv[3::2]))
tot = []
for f in sorted(glob.glob(d + '/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1))):
    t = float(re.search(r'at-([\d.]+)s', f).group(1))
    a = cv2.imread(f); b = src(t)
    e4, e12 = blurdiff(a, b, 4), blurdiff(a, b, 12)
    tot.append((t, e4, e12))
    if '--crop' in opts:
        x0, y0, x1, y1 = map(int, opts['--crop'].split(',')); a2, b2 = a[y0:y1, x0:x1], b[y0:y1, x0:x1]
    else: a2, b2 = a, b
    im = np.vstack([a2, b2]) if '--side' not in opts else np.hstack([a2, b2])
    sc = min(1.0, 1400 / im.shape[1])
    cv2.imwrite(f'{d}/cmp-{t:.2f}.jpg', cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 88])
    print(f'{t:7.2f}  s4 {e4:6.2f}  s12 {e12:6.2f}')
if tot: print('mean  s4 %.2f  s12 %.2f' % (np.mean([x[1] for x in tot]), np.mean([x[2] for x in tot])))
