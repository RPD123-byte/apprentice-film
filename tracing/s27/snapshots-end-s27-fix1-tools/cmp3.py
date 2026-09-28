# rows of SRC | BEFORE | NEW crops: cmp3.py NEWDIR OUT F1,F2 sc x0 y0 x1 y1 [BEFOREDIR]
import cv2, numpy as np, sys
nd, OUT, fr, sc = sys.argv[1], sys.argv[2], list(map(int, sys.argv[3].split(','))), float(sys.argv[4])
x0, y0, x1, y1 = map(int, sys.argv[5:9]); bd = sys.argv[9] if len(sys.argv) > 9 else 'before'
rows = []
for F in fr:
    r = []
    for p, l in ((f'src/s{F}.png', 'SRC'), (f'{bd}/r{F}.png', 'BEFORE'), (f'{nd}/r{F}.png', 'NEW')):
        im = cv2.imread(p)
        if im is None: im = np.zeros((946, 2206, 3), np.uint8)
        im = cv2.resize(im[y0:y1, x0:x1], None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA if sc < 1 else cv2.INTER_CUBIC)
        cv2.putText(im, f'{l} {F/25:.2f}', (6, 22), 0, 0.6, (0, 0, 0), 4); cv2.putText(im, f'{l} {F/25:.2f}', (6, 22), 0, 0.6, (255, 255, 255), 1)
        r += [im, np.full((im.shape[0], 4, 3), 255, np.uint8)]
    rows += [np.hstack(r[:-1]), np.full((4, sum(a.shape[1] for a in r[:-1]), 3), 255, np.uint8)]
cv2.imwrite(OUT, np.vstack(rows[:-1]), [cv2.IMWRITE_JPEG_QUALITY, 88])
