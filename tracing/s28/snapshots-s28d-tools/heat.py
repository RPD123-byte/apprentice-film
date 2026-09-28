# heat.py render.png T out.jpg [sigma]  -> signed blurred difference (render - source) as a colour map + per-region table
import sys, cv2, numpy as np
from lib import src
a = cv2.imread(sys.argv[1]).astype(np.float32); t = float(sys.argv[2]); s = float(sys.argv[4]) if len(sys.argv) > 4 else 12
b = src(t).astype(np.float32)
A = cv2.GaussianBlur(a, (0, 0), s); B = cv2.GaussianBlur(b, (0, 0), s)
d = (A - B)
L = d.mean(2)
v = np.clip(L / 40, -1, 1)
im = np.zeros_like(a); im[..., 2] = np.clip(v, 0, 1) * 255; im[..., 0] = np.clip(-v, 0, 1) * 255
im[..., 1] = np.clip(np.abs(d).max(2) / 40, 0, 1) * 120
o = cv2.addWeighted(cv2.cvtColor(cv2.cvtColor(b.astype(np.uint8), cv2.COLOR_BGR2GRAY), cv2.COLOR_GRAY2BGR), 0.35, im.astype(np.uint8), 0.9, 0)
for x in range(0, 2206, 200): cv2.line(o, (x, 0), (x, 946), (80, 80, 80), 1); cv2.putText(o, str(x), (x + 2, 14), 0, 0.45, (200, 200, 200), 1)
for y in range(0, 946, 200): cv2.line(o, (0, y), (2206, y), (80, 80, 80), 1); cv2.putText(o, str(y), (2, y - 2), 0, 0.45, (200, 200, 200), 1)
cv2.imwrite(sys.argv[3], cv2.resize(o, None, fx=0.6, fy=0.6))
# per-cell mean signed colour error (render - source), 8-bit, BGR->RGB
print('cell (x,y 200px): mean |err| and signed RGB')
for y in range(0, 946, 200):
    row = []
    for x in range(0, 2206, 200):
        c = d[y:y + 200, x:x + 200].reshape(-1, 3).mean(0)[::-1]
        row.append(f'{np.abs(d[y:y+200,x:x+200]).mean():4.0f}')
    print(y, ' '.join(row))
