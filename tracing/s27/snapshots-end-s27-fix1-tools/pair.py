# end-s27-rev1: source above render (optionally film.mp4 below) for one frame and crop at scale. Usage: pair.py WORK F OUT sc x0 y0 x1 y1 [film]
import cv2, numpy as np, sys
W, F, OUT, sc = sys.argv[1], int(sys.argv[2]), sys.argv[3], float(sys.argv[4])
x0, y0, x1, y1 = map(int, sys.argv[5:9]); film = len(sys.argv) > 9
L = [('SRC', f'{W}/src/s{F}.png'), ('NOW', f'{W}/render/r{F}.png')] + ([('film.mp4', f'{W}/film/f{F}.png')] if film else [])
out = []
for l, p in L:
    im = cv2.imread(p)[y0:y1, x0:x1]; im = cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA if sc < 1 else cv2.INTER_CUBIC)
    cv2.putText(im, f'{l} {F/25:.2f}', (6, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 4); cv2.putText(im, f'{l} {F/25:.2f}', (6, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 1)
    out.append(im)
horiz = (x1 - x0) < 1.3 * (y1 - y0)
cv2.imwrite(OUT, np.hstack(out) if horiz else np.vstack(out), [cv2.IMWRITE_JPEG_QUALITY, 90])
