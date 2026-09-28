# strokes.py x0 y0 x1 y1 S out.jpg : draw the plate's FINE strokes in a box over the source mean, colour by value (red = dark v<0.3, orange 0.3-0.5, green 0.5-0.7, blue light), index labels
import re, base64, sys, cv2, numpy as np
x0, y0, x1, y1, s = map(int, sys.argv[1:6]); out = sys.argv[6]
src = open('/Users/computer/rootline/apprentice-film/src/shots/s07/data/plate.js').read()
m = re.search(r'export const FINE = \["(\w+)", "([^"]+)"\]', src); S = np.frombuffer(base64.b64decode(m.group(2)), np.int16)
bg = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s07-fix2-cmp/tools/srcmean.png')[y0:y1, x0:x1]
bg = cv2.resize(bg, None, fx=s, fy=s, interpolation=cv2.INTER_CUBIC); bg = (bg * 0.55).astype(np.uint8)
i = 0; idx = -1; info = []
while i < len(S):
    n = int(S[i]); i += 1; P = S[i:i + 4 * n].reshape(-1, 4).astype(float); i += 4 * n; idx += 1
    xs, ys = P[:, 0] / 8, P[:, 1] / 8
    if n < 2 or xs.max() < x0 or xs.min() > x1 or ys.max() < y0 or ys.min() > y1: continue
    v = P[:, 3].mean() / 1000
    c = (0, 0, 255) if v < 0.3 else (0, 140, 255) if v < 0.5 else (0, 200, 0) if v < 0.7 else (255, 160, 0)
    pts = np.stack([(xs - x0) * s, (ys - y0) * s], 1).astype(np.int32)
    cv2.polylines(bg, [pts], False, c, max(1, int(P[:, 2].mean() / 20 * s * 0.5)))
    info.append((idx, n, v))
cv2.imwrite(out, bg)
print(len(info), 'strokes')
