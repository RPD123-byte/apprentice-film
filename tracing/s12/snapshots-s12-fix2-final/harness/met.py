# python met.py dir  -> region metrics for r-34.0/35.2/35.3 vs src 850/880/882
import cv2, numpy as np, sys
d = sys.argv[1]
PAIRS = [('34.0', 850), ('35.2', 880), ('35.3', 882)]
R = {
 'owl': (640, 0, 1960, 946), 'cup': (1260, 90, 1480, 420), 'shell': (1300, 330, 1420, 395), 'cush': (1232, 180, 1268, 330),
 'tuft': (1180, 55, 1275, 165), 'feet': (1060, 850, 1450, 946), 'footL': (1060, 860, 1180, 946), 'footR': (1280, 880, 1450, 946),
 'belly': (1176, 870, 1290, 910), 'crown': (1000, 60, 1160, 115), 'nblock': (1250, 0, 1380, 70), 'fband': (790, 0, 870, 115),
 'shoul': (1200, 370, 1530, 480), 'wing': (1450, 400, 1760, 720), 'flank': (1380, 700, 1713, 890), 'tail': (1740, 730, 1950, 850),
 'eyes': (745, 280, 1090, 450), 'beak': (880, 440, 1000, 600),
}
sel = sys.argv[2].split(',') if len(sys.argv) > 2 else list(R)
for t, f in PAIRS:
  import os
  if not os.path.exists(f"{d}/r-{t}.png"): continue
  a = cv2.imread(f"{d}/r-{t}.png", 0).astype(np.float32); b = cv2.imread(f'src-{f}.png', 0).astype(np.float32)
  a3, b3 = cv2.GaussianBlur(a, (0, 0), 3), cv2.GaussianBlur(b, (0, 0), 3)
  a12, b12 = cv2.GaussianBlur(a, (0, 0), 12), cv2.GaussianBlur(b, (0, 0), 12)
  out = []
  for k in sel:
    x0, y0, x1, y1 = R[k]
    s3 = np.abs(a3[y0:y1, x0:x1] - b3[y0:y1, x0:x1]).mean(); s12 = np.abs(a12[y0:y1, x0:x1] - b12[y0:y1, x0:x1]).mean()
    md = (a12[y0:y1, x0:x1] - b12[y0:y1, x0:x1]).mean()
    out.append(f'{k} {s3:.1f}/{s12:.1f}/{md:+.0f}')
  print(t, ' | '.join(out))
