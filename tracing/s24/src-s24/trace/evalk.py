# offline check of one frame's traced lines: render bars in python, compare against the source background
import sys, json; sys.path.insert(0, '.')
from common import *
from track_lines import render_tracked
k = int(sys.argv[1]); d = json.load(open(f'out/lines_k{k:02d}.json'))
u = U(k)
img = render_tracked([c[:5] + [c[5]] for c in d['lines']])
# compare where our owl/objects are not: approximate by source < 250 and away from bright blobs
bg = cv2.morphologyEx(u, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31))) < 30
e = np.abs(cv2.GaussianBlur(img, (0, 0), 1.5) - cv2.GaussianBlur(u, (0, 0), 1.5))[bg].mean()
print(k, 'bars', len(d['lines']), 'bg err σ1.5 %.2f' % e)
