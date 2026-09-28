# end-s27-tfix: best integer shift of the render's edges onto the source's edges in a box (chamfer, +-R px). chamoff.py DIR F.. "box"
import cv2, numpy as np, sys
D = sys.argv[1]; FS = list(map(int, sys.argv[2].split(','))); boxes = eval(sys.argv[3]); R = 12
def edges(im):
    g = cv2.GaussianBlur(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY), (0, 0), 1.8); return cv2.Canny(g, 30, 70)
for F in FS:
    s = cv2.imread(f'src/s{F}.png'); r = cv2.imread(f'{D}/r{F}.png')
    es, er = edges(s), edges(r)
    dt = cv2.distanceTransform((es == 0).astype(np.uint8), cv2.DIST_L2, 5)
    out = []
    for nm, (x0, y0, x1, y1) in boxes.items():
        ys, xs = np.nonzero(er[y0:y1, x0:x1]); ys += y0; xs += x0
        best = None
        for dy in range(-R, R + 1):
            for dx in range(-R, R + 1):
                yy = np.clip(ys + dy, 0, 945); xx = np.clip(xs + dx, 0, 2205)
                c = np.minimum(dt[yy, xx], 8).mean()
                if best is None or c < best[0]: best = (c, dx, dy)
        c0 = np.minimum(dt[ys, xs], 8).mean()
        out.append(f'{nm} ({best[1]:+d},{best[2]:+d}) {c0:.2f}->{best[0]:.2f}')
    print(F, '%.2f' % (F / 25), ' | '.join(out))
