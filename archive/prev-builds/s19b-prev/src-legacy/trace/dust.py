# Dust cloud outline per source frame (measurement only): background difference against the clean 57.32/57.36 frame
# inside the dust box, the owl's side cut off at a per-frame x, largest component(s), simplified outer contour.
import sys, json, numpy as np, cv2
from common import frame
clean = np.mean([frame(1433), frame(1434)], 0).astype(np.float32)
out = {}
cut = {58.16: 1380, 58.20: 1330, 58.24: 1300, 58.28: 1300, 58.32: 1290}
for n in range(1454, 1475):
    t = round(n / 25, 2)
    g = frame(n).astype(np.float32)
    d = cv2.GaussianBlur(np.abs(g - clean), (0, 0), 1.5)
    m = (d > (30 if t < 58.56 else 13)).astype(np.uint8)
    m[:, :cut.get(t, 1280)] = 0; m[:{58.16: 765, 58.2: 690}.get(t, 540)] = 0; m[900:] = 0; m[:, 1760:] = 0
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15) if t < 58.58 else (7, 7)))
    if t < 58.58:     # the solid cloud: fill it; later the wisps keep their gaps
        ff = m.copy(); msk = np.zeros((m.shape[0] + 2, m.shape[1] + 2), np.uint8); cv2.floodFill(ff, msk, (0, 0), 1); m = m | (1 - ff)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cs = [c for c in cs if cv2.contourArea(c) > 150]
    polys = [cv2.approxPolyDP(c, 2.0, True)[:, 0, :].tolist() for c in sorted(cs, key=cv2.contourArea, reverse=True)[:12]]
    area = sum(cv2.contourArea(c) for c in cs)
    # interior value (graded) for the fill
    fill = float(np.median(g[m > 0])) if m.sum() else 0
    out[f'{t:.2f}'] = {'polys': polys, 'fill': round(fill, 1)}
    print(t, 'pieces', len(polys), 'area', int(area), 'fill', round(fill, 1), 'box', cv2.boundingRect(np.vstack(cs)) if cs else None)
json.dump(out, open(sys.argv[1], 'w'))
