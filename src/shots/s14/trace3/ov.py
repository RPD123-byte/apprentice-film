# overlay geo3.js polygons on a source frame crop: ov.py x0 y0 x1 y1 scale out.jpg [t] [grid] [only,prefixes] [--render frame.png]
import sys, cv2
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from common import *
a = sys.argv[1:]
rend = None
if '--render' in a: i = a.index('--render'); rend = a[i + 1]; a = a[:i] + a[i + 2:]
x0, y0, x1, y1 = map(int, a[:4]); sc = float(a[4]); out = a[5]
t = float(a[6]) if len(a) > 6 else 40.0
grid = int(a[7]) if len(a) > 7 else 50
only = a[8].split(',') if len(a) > 8 else None
img = cv2.imread(rend) if rend else src(t)
try: G = geo()
except Exception as e: print('geo', e); G = {}
cv2.imwrite(out, overlay(img, G, (x0, y0, x1, y1), sc, grid, only), [cv2.IMWRITE_JPEG_QUALITY, 90])
