import json, subprocess, sys, cv2, numpy as np
# usage: look.py F.json out.jpg [x0 y0 x1 y1 local] [Z]
F = json.load(open(sys.argv[1])); out = sys.argv[2]
box = [int(v) for v in sys.argv[3:7]] if len(sys.argv) > 6 else [-115, -60, 215, 112]
Z = int(sys.argv[7]) if len(sys.argv) > 7 else 3
subprocess.run(['node', 'ev.mjs', 'view.js', json.dumps({'F': F, 'Z': Z, 'out': 'lk'})], capture_output=True)
a = cv2.imread('ev/lk.png')
b = np.load('../s22/bot_pre_med.npy'); b = cv2.resize((np.clip(b, 0, 1) * 255).astype(np.uint8), None, fx=Z, fy=Z, interpolation=cv2.INTER_CUBIC)
b = cv2.cvtColor(b, cv2.COLOR_GRAY2BGR)
x0, y0, x1, y1 = [(v + o) * Z for v, o in zip(box, [115, 60, 115, 60])]
cv2.imwrite(out, np.hstack([a[y0:y1, x0:x1], b[y0:y1, x0:x1]]) if (x1 - x0) < 700 else np.vstack([a[y0:y1, x0:x1], b[y0:y1, x0:x1]]))
