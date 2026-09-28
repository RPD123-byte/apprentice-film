# end-s27-rev1: rows of source | now | film.mp4 for a frame list. Usage: sheet.py WORK OUT F1,F2,... [scale] [x0 y0 x1 y1]
import cv2, numpy as np, sys
W, OUT, fr = sys.argv[1], sys.argv[2], list(map(int, sys.argv[3].split(',')))
sc = float(sys.argv[4]) if len(sys.argv) > 4 else 0.3
box = list(map(int, sys.argv[5:9])) if len(sys.argv) > 8 else None
rows = []
for F in fr:
    r = []
    for p, l in ((f'{W}/src/s{F}.png', 'SRC'), (f'{W}/render/r{F}.png', 'NOW'), (f'{W}/film/f{F}.png', 'film.mp4')):
        im = cv2.imread(p)
        if box: im = im[box[1]:box[3], box[0]:box[2]]
        im = cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA)
        cv2.putText(im, f'{l} {F/25:.2f}', (6, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 4); cv2.putText(im, f'{l} {F/25:.2f}', (6, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
        r.append(im); r.append(np.full((im.shape[0], 4, 3), 255, np.uint8))
    rows.append(np.hstack(r[:-1])); rows.append(np.full((4, rows[-1].shape[1], 3), 255, np.uint8))
cv2.imwrite(OUT, np.vstack(rows[:-1]), [cv2.IMWRITE_JPEG_QUALITY, 88])
