# end-s26-rev2: side-by-side sheet. usage: tri.py out.jpg W F1,F2,... label=pattern{F} ...  (columns in the given order)
import cv2, numpy as np, sys
out, w, Fs, cols = sys.argv[1], int(sys.argv[2]), [int(x) for x in sys.argv[3].split(",")], sys.argv[4:]
rows = []
for F in Fs:
    tiles = []
    for c in cols:
        lbl, pat = c.split("=", 1); im = cv2.imread(pat.format(F=F))
        if im is None: im = np.zeros((946, 2206, 3), np.uint8)
        im = cv2.resize(im, (w, int(w * 946 / 2206)), interpolation=cv2.INTER_AREA)
        cv2.putText(im, f"{lbl} F{F} {F/25:.2f}", (8, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 4)
        cv2.putText(im, f"{lbl} F{F} {F/25:.2f}", (8, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        tiles.append(im)
    rows.append(np.hstack(tiles))
cv2.imwrite(out, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 88]); print("wrote", out)
