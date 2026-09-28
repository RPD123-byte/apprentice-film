# gridded 2x crops: SRC | other dirs. grid2.py OUT F x0 y0 x1 y1 dir1/prefix [dir2/prefix...]
import cv2, numpy as np, sys
OUT, F = sys.argv[1], int(sys.argv[2]); x0, y0, x1, y1 = map(int, sys.argv[3:7]); dirs = sys.argv[7:]
sc = float(__import__('os').environ.get('SC', 2))
def grid(im):
    c = cv2.resize(im[y0:y1, x0:x1], None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
    for x in range((x0 // 20) * 20, x1, 20):
        if x < x0: continue
        cv2.line(c, (int((x - x0) * sc), 0), (int((x - x0) * sc), c.shape[0]), (0, 0, 255) if x % 100 == 0 else (200, 200, 255), 1)
        if x % 100 == 0: cv2.putText(c, str(x), (int((x - x0) * sc) + 2, 12), 0, 0.4, (0, 0, 255), 1)
    for y in range((y0 // 20) * 20, y1, 20):
        if y < y0: continue
        cv2.line(c, (0, int((y - y0) * sc)), (c.shape[1], int((y - y0) * sc)), (0, 0, 255) if y % 100 == 0 else (200, 200, 255), 1)
        if y % 100 == 0: cv2.putText(c, str(y), (2, int((y - y0) * sc) - 2), 0, 0.4, (0, 0, 255), 1)
    return c
W = '/Users/computer/rootline/apprentice-film/snapshots/end-s27-tfix-work'
ims = [grid(cv2.imread(f'{W}/src/s{F}.png'))] + [grid(cv2.imread(f'{W}/{d}{F}.png')) for d in dirs]
cv2.imwrite(OUT, np.vstack(ims) if (x1 - x0) > 1.3 * (y1 - y0) else np.hstack(ims))
