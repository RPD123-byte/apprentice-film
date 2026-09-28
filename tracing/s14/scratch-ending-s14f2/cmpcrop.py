# cmpcrop.py renderdir t x0 y0 x1 y1 scale out.jpg [stretch]  -> render (top) / source (bottom) crops with a grid
import sys, cv2, numpy as np, glob, re
d, t = sys.argv[1], float(sys.argv[2]); x0, y0, x1, y1 = map(int, sys.argv[3:7]); sc = float(sys.argv[7]); out = sys.argv[8]
st = float(sys.argv[9]) if len(sys.argv) > 9 else 1.0
f = [p for p in glob.glob(d + '/frame-*.png') if abs(float(re.search(r'at-([\d.]+)s', p).group(1)) - t) < 1e-3][0]
ims = []
for p in (f, f.replace('frame-', 'ref-')):
    L = cv2.cvtColor(cv2.imread(p), cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    L = np.clip(L / st, 0, 1) ** (0.7 if st < 1 else 1)
    im = cv2.cvtColor((L[y0:y1, x0:x1] * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
    im = cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
    step = 25 if sc >= 2 else 50
    for gx in range((x0 // step) * step, x1 + 1, step):
        X = int((gx - x0) * sc)
        if 0 <= X < im.shape[1]:
            cv2.line(im, (X, 0), (X, im.shape[0]), (0, 0, 255) if gx % 100 == 0 else (0, 90, 140), 1)
            if gx % (2 * step) == 0: cv2.putText(im, str(gx), (X + 2, 12), 0, 0.4, (0, 220, 255), 1)
    for gy in range((y0 // step) * step, y1 + 1, step):
        Y = int((gy - y0) * sc)
        if 0 <= Y < im.shape[0]:
            cv2.line(im, (0, Y), (im.shape[1], Y), (0, 0, 255) if gy % 100 == 0 else (0, 90, 140), 1)
            if gy % (2 * step) == 0: cv2.putText(im, str(gy), (2, Y - 2), 0, 0.4, (0, 220, 255), 1)
    ims.append(im)
cv2.imwrite(out, np.vstack([ims[0], np.full((4, ims[0].shape[1], 3), (0, 0, 255), np.uint8), ims[1]]), [cv2.IMWRITE_JPEG_QUALITY, 88])
