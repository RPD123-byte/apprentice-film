import cv2, json, sys, numpy as np
im = cv2.imread('../f2r-meas/classmap.png')
for f in sys.argv[2:]:
    J = json.load(open(f))
    for k, pts in enumerate(J['b']):
        P = np.array(pts, np.int32)
        cv2.polylines(im, [P], False, (0, 255, 0) if k in (0, len(J['b']) - 1) else (255, 255, 0), 2)
        for p in P: cv2.circle(im, tuple(int(v) for v in p), 3, (0, 255, 255), -1)
x0, y0, x1, y1 = [int(v) for v in sys.argv[1].split(',')]
cv2.imwrite('ovrib.jpg', im[y0:y1, x0:x1])
