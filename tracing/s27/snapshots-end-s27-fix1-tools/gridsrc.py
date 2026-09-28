# gridded crops of one image dir over frames, stacked: gridsrc.py DIR prefix OUT F1,F2,.. x0 y0 x1 y1 [sc] [step]
import cv2, numpy as np, sys
d, p, OUT, fr = sys.argv[1], sys.argv[2], sys.argv[3], list(map(int, sys.argv[4].split(',')))
x0, y0, x1, y1 = map(int, sys.argv[5:9]); sc = float(sys.argv[9]) if len(sys.argv) > 9 else 1; st = int(sys.argv[10]) if len(sys.argv) > 10 else 50
out = []
for F in fr:
    im = cv2.imread(f'{d}/{p}{F}.png')[y0:y1, x0:x1].copy()
    im = cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
    for x in range((x0 // st + 1) * st, x1, st):
        X = int((x - x0) * sc); cv2.line(im, (X, 0), (X, im.shape[0]), (0, 255, 255) if x % 100 == 0 else (0, 150, 150), 1)
        if x % 100 == 0: cv2.putText(im, str(x), (X + 2, 12), 0, 0.4, (0, 0, 255), 1)
    for y in range((y0 // st + 1) * st, y1, st):
        Y = int((y - y0) * sc); cv2.line(im, (0, Y), (im.shape[1], Y), (0, 255, 255) if y % 100 == 0 else (0, 150, 150), 1)
        if y % 100 == 0: cv2.putText(im, str(y), (2, Y - 2), 0, 0.4, (0, 0, 255), 1)
    cv2.putText(im, f'{p}{F/25:.2f}', (30, 28), 0, 0.7, (0, 0, 0), 4); cv2.putText(im, f'{p}{F/25:.2f}', (30, 28), 0, 0.7, (255, 255, 255), 1)
    out.append(im); out.append(np.full((4, im.shape[1], 3), 255, np.uint8))
cv2.imwrite(OUT, np.vstack(out[:-1]), [cv2.IMWRITE_JPEG_QUALITY, 90])
