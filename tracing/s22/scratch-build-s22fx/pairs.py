import cv2, numpy as np, sys, json
# pairs.py rdir out.jpg F:x0:y0:x1:y1[:Z] ...   -> stacked render|source crops (render left)
fr = np.load('../s22/frames.npy', mmap_mode='r')
rd, out = sys.argv[1], sys.argv[2]
rows = []
for spec in sys.argv[3:]:
    p = spec.split(':'); F = int(p[0]); x0, y0, x1, y1 = map(int, p[1:5]); Z = float(p[5]) if len(p) > 5 else 1
    a = __import__('rmap').rimg(F); b = np.array(fr[F - 1863])
    c = np.hstack([a[y0:y1, x0:x1], b[y0:y1, x0:x1]])
    if Z != 1: c = cv2.resize(c, None, fx=Z, fy=Z, interpolation=cv2.INTER_CUBIC)
    cv2.putText(c, str(F / 25), (4, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
    rows.append(c)
w = max(r.shape[1] for r in rows)
rows = [np.pad(r, ((0, 0), (0, w - r.shape[1]), (0, 0))) for r in rows]
cv2.imwrite(out, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 90])
