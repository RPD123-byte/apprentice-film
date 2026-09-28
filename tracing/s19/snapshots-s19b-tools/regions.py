# regions.py : mean un-graded values (render vs target) for named regions
import sys; sys.path.insert(0, '.')
from lab import *
import numpy as np, cv2, json
L = Lab(); im = L.dev('room', {'lit': False}); L.close()
R = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32)
cv2.imwrite('../s19b-study/room_r.png', im)
T = np.load('../s19b-study/ungr_comp.npy') * 255
REG = {'post': (650, 380, 705, 745), 'rface': (705, 500, 860, 745), 'rrim': (705, 380, 870, 500), 'rpost': (856, 506, 904, 760), 'front': (360, 480, 640, 740), 'frim': (360, 385, 650, 470),
  'woofL': (830, 200, 990, 560), 'woofR': (1050, 150, 1200, 560), 'cab_below': (860, 560, 990, 760), 'cab_low': (1000, 580, 1300, 760), 'cab_top': (700, 0, 1300, 110),
  'case_low': (40, 450, 340, 760), 'case_neck': (380, 0, 660, 300), 'grille': (0, 0, 250, 170), 'panel': (0, 170, 200, 440), 'wall': (600, 0, 700, 330),
  'plank_top': (1320, 0, 1500, 130), 'scissors': (1150, 130, 1540, 800), 'jack': (1497, 120, 1680, 350), 'rcab_front': (1520, 340, 1700, 770), 'rcab_top': (1560, 40, 1720, 330),
  'boxes': (2020, 0, 2206, 760), 'mid_right': (1760, 0, 2020, 790), 'floor': (0, 790, 2206, 946), 'tweeter': (930, 0, 1070, 80)}
for k, (x0, y0, x1, y1) in REG.items():
    r = R[y0:y1, x0:x1].mean(); t = T[y0:y1, x0:x1].mean()
    print(f'{k:11s} render {r:6.1f}  target {t:6.1f}  {r - t:+6.1f}')
