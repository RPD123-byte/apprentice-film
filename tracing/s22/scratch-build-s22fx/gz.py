import numpy as np, cv2, sys
# gz.py src(bot|top|npy path) x0 y0 x1 y1 Z out [origin_x origin_y]  -- local-coord grid zoom of a crop array
src, x0, y0, x1, y1, Z, out = sys.argv[1], *map(int, sys.argv[2:7]), sys.argv[7]
ox, oy = (int(sys.argv[8]), int(sys.argv[9])) if len(sys.argv) > 9 else (115, 60)
a = np.load('../s22/%s_pre_med.npy' % src) if src in ('bot', 'top') else np.load(src)
c = a[y0 + oy:y1 + oy, x0 + ox:x1 + ox]
im = cv2.resize((np.clip(c, 0, 1) * 255).astype(np.uint8), None, fx=Z, fy=Z, interpolation=cv2.INTER_CUBIC)
im = cv2.cvtColor(im, cv2.COLOR_GRAY2BGR)
st = 5 if (x1 - x0) > 60 else 2
for lx in range(x0, x1 + 1):
    if lx % st: continue
    X = int((lx - x0 + 0.5) * Z); cv2.line(im, (X, 0), (X, im.shape[0]), (0, 140, 255) if lx % 10 == 0 else (0, 70, 0), 1)
    if lx % 10 == 0: cv2.putText(im, str(lx), (X + 1, 10), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 220, 255), 1)
for ly in range(y0, y1 + 1):
    if ly % st: continue
    Y = int((ly - y0 + 0.5) * Z); cv2.line(im, (0, Y), (im.shape[1], Y), (0, 140, 255) if ly % 10 == 0 else (0, 70, 0), 1)
    if ly % 10 == 0: cv2.putText(im, str(ly), (1, Y - 1), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 220, 255), 1)
cv2.imwrite(out, im)
