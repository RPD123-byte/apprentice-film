# end-s27-rev1: rows of SRC | NOW for frames and a crop. Usage: pairs2.py WORK OUT F1,F2 sc x0 y0 x1 y1
import cv2, numpy as np, sys
W, OUT, fr, sc = sys.argv[1], sys.argv[2], list(map(int, sys.argv[3].split(','))), float(sys.argv[4])
x0, y0, x1, y1 = map(int, sys.argv[5:9])
rows = []
for F in fr:
    r = []
    for p, l in ((f'{W}/src/s{F}.png', 'SRC'), (f'{W}/render/r{F}.png', 'NOW')):
        im = cv2.resize(cv2.imread(p)[y0:y1, x0:x1], None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA if sc < 1 else cv2.INTER_CUBIC)
        cv2.putText(im, f'{l} {F/25:.2f}', (6, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 4); cv2.putText(im, f'{l} {F/25:.2f}', (6, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
        r += [im, np.full((im.shape[0], 4, 3), 255, np.uint8)]
    rows += [np.hstack(r[:-1]), np.full((4, np.hstack(r[:-1]).shape[1], 3), 255, np.uint8)]
cv2.imwrite(OUT, np.vstack(rows[:-1]), [cv2.IMWRITE_JPEG_QUALITY, 90])
