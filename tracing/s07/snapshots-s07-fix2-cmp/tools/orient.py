# orient.py DIR N x0 y0 x1 y1 : gradient-orientation histogram (magnitude weighted, 15 deg bins of the EDGE direction, 0 = vertical edge line) + fine-detail energy per x band
import sys, cv2, numpy as np
d, n = sys.argv[1], int(sys.argv[2]); x0, y0, x1, y1 = map(int, sys.argv[3:7])
S = '/Users/computer/rootline/apprentice-film/snapshots/s07-bt/src'
def hist(im):
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32)
    g = cv2.GaussianBlur(g, (0, 0), 1.0)
    gx = cv2.Sobel(g, cv2.CV_32F, 1, 0); gy = cv2.Sobel(g, cv2.CV_32F, 0, 1)
    gx, gy = gx[y0:y1, x0:x1], gy[y0:y1, x0:x1]
    m = np.hypot(gx, gy); a = (np.degrees(np.arctan2(gy, gx)) + 180) % 180   # gradient dir; 0 = horizontal gradient = vertical edge
    # signed: edge line direction measured from vertical, -90..90 (positive = top leans right)
    b = ((a + 90) % 180) - 90
    h, _ = np.histogram(b, bins=12, range=(-90, 90), weights=m)
    return h / h.sum()
def fine(im):
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32)
    return np.abs(g - cv2.GaussianBlur(g, (0, 0), 2))
r = cv2.imread(f'{d}/r{n:04d}.png'); s = cv2.imread(f'{S}/n{n:04d}.png')
print('bins (edge angle from vertical, deg):', ' '.join('%4d' % b for b in range(-90, 90, 15)))
print('render:', ' '.join('%.3f' % v for v in hist(r)))
print('source:', ' '.join('%.3f' % v for v in hist(s)))
fr, fs = fine(r), fine(s)
for xa in range(x0, x1, 30):
    print('x %d-%d fine r %.1f s %.1f   mean r %.1f s %.1f' % (xa, xa + 30, fr[y0:y1, xa:xa + 30].mean(), fs[y0:y1, xa:xa + 30].mean(),
        cv2.cvtColor(r, cv2.COLOR_BGR2GRAY)[y0:y1, xa:xa + 30].mean(), cv2.cvtColor(s, cv2.COLOR_BGR2GRAY)[y0:y1, xa:xa + 30].mean()))
