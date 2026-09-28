# end-s27-rev1: SRC above NOW crop with a coordinate grid every 50 px (frame coords). Usage: gridpair.py WORK F OUT x0 y0 x1 y1 [sc]
import cv2, numpy as np, sys
W, F, OUT = sys.argv[1], int(sys.argv[2]), sys.argv[3]; x0, y0, x1, y1 = map(int, sys.argv[4:8]); sc = float(sys.argv[8]) if len(sys.argv) > 8 else 1
out = []
for p, l in ((f'{W}/src/s{F}.png', 'SRC'), (f'{W}/render/r{F}.png', 'NOW')):
    im = cv2.imread(p)[y0:y1, x0:x1].copy()
    for x in range((x0 // 50 + 1) * 50, x1, 50):
        cv2.line(im, (x - x0, 0), (x - x0, y1 - y0), (0, 255, 255) if x % 100 == 0 else (0, 160, 160), 1)
        if x % 100 == 0: cv2.putText(im, str(x), (x - x0 + 2, 12), 0, 0.4, (0, 0, 255), 1)
    for y in range((y0 // 50 + 1) * 50, y1, 50):
        cv2.line(im, (0, y - y0), (x1 - x0, y - y0), (0, 255, 255) if y % 100 == 0 else (0, 160, 160), 1)
        if y % 100 == 0: cv2.putText(im, str(y), (2, y - y0 - 2), 0, 0.4, (0, 0, 255), 1)
    im = cv2.resize(im, None, fx=sc, fy=sc)
    cv2.putText(im, f'{l} {F/25:.2f}', (40, 30), 0, 0.7, (0, 0, 0), 4); cv2.putText(im, f'{l} {F/25:.2f}', (40, 30), 0, 0.7, (255, 255, 255), 1)
    out.append(im)
cv2.imwrite(OUT, np.vstack(out) if (x1 - x0) > (y1 - y0) else np.hstack(out), [cv2.IMWRITE_JPEG_QUALITY, 90])
