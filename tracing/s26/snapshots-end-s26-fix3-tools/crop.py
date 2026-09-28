# end-s26-rev2: 1:1 (or scaled) crops side by side. usage: crop.py out.jpg x0,y0,x1,y1 scale F1,F2,.. label=pattern{F} ...
import cv2, numpy as np, sys
out, box, sc, Fs, cols = sys.argv[1], [int(v) for v in sys.argv[2].split(",")], float(sys.argv[3]), [int(x) for x in sys.argv[4].split(",")], sys.argv[5:]
x0, y0, x1, y1 = box; rows = []
for F in Fs:
    t = []
    for c in cols:
        lbl, pat = c.split("=", 1); im = cv2.imread(pat.format(F=F))
        im = np.zeros((946, 2206, 3), np.uint8) if im is None else im
        im = cv2.resize(im[y0:y1, x0:x1], None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA if sc < 1 else cv2.INTER_CUBIC)
        cv2.putText(im, f"{lbl} {F}", (6, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 4); cv2.putText(im, f"{lbl} {F}", (6, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 1)
        t.append(im); t.append(np.full((im.shape[0], 4, 3), 80, np.uint8))
    rows.append(np.hstack(t[:-1])); rows.append(np.full((4, rows[-1].shape[1], 3), 80, np.uint8))
cv2.imwrite(out, np.vstack(rows[:-1]), [cv2.IMWRITE_JPEG_QUALITY, 90]); print("wrote", out)
