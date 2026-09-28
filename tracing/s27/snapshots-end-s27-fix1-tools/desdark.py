# dark-area fraction (L<60 of 255, Lab L on graded frame) in designer zones, and fine-texture/edge stats. desdark.py F dir:prefix ...
import cv2, numpy as np, sys
F = int(sys.argv[1])
Z = {'beanie': (640, 100, 1060, 380), 'crown': (720, 90, 960, 190), 'hair': (500, 260, 700, 480), 'face': (700, 330, 900, 520), 'jacket': (40, 280, 480, 700)}
for a in sys.argv[2:]:
    d, p = a.split(':'); im = cv2.imread(f'{d}/{p}{F}.png')
    L = cv2.cvtColor(im, cv2.COLOR_BGR2LAB)[..., 0].astype(float)
    out = []
    for k, (x0, y0, x1, y1) in Z.items():
        z = L[y0:y1, x0:x1]; out.append(f'{k} {100 * (z < 60).mean():5.1f}%')
    print(f'{d:10s}', ' | '.join(out))
