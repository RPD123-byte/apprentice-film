import cv2, json, sys, numpy as np, re
im = cv2.imread('../f2r-meas/page-graded.png')
for f in sys.argv[2:]:
    txt = open(f).read().strip().rstrip(',')
    items = json.loads('[' + txt + ']')
    for k, it in enumerate(items):
        P = np.array(it[2], np.int32).reshape(-1, 2)
        cv2.polylines(im, [P], True, (0, 255, 0), 1)
        c = P.mean(0).astype(int); cv2.putText(im, str(k), tuple(int(v) for v in c), 0, 0.45, (0, 255, 255), 1)
        for t in (it[3] if len(it) > 3 else []):
            cv2.polylines(im, [np.array(t, np.int32).reshape(-1, 2)], True, (255, 0, 255), 1)
x0, y0, x1, y1 = [int(v) for v in sys.argv[1].split(',')]
cv2.imwrite('ovq.jpg', cv2.resize(im[y0:y1, x0:x1], None, fx=1.5, fy=1.5))
