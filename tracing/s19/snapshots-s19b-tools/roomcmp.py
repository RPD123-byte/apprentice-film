# room plate (un-graded) vs the un-graded source targets, blurred; per-region MAE and a side-by-side
import sys; sys.path.insert(0, '.')
from lab import *
import numpy as np, cv2, time
L = Lab()
a = time.time(); im = L.dev('room', {'lit': False}); print('room ms', round((time.time() - a) * 1000))
lit = L.dev('room', {'lit': True})
L.close()
R = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
RL = cv2.cvtColor(lit, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
T6 = np.load('../s19b-study/ungr_6308.npy'); TL = np.load('../s19b-study/ungr_lit.npy')
b = lambda x, s=8: cv2.GaussianBlur(x, (0, 0), s)
regions = {'grille': (0, 0, 250, 170), 'panel': (0, 170, 200, 440), 'case_low': (40, 450, 340, 760), 'case_neck': (380, 0, 660, 300), 'wall': (600, 0, 700, 320),
  'cab_top': (700, 0, 1300, 110), 'woofer': (830, 120, 1200, 560), 'cab_low': (910, 570, 1300, 740), 'crate_front': (355, 380, 650, 760), 'crate_right': (705, 372, 905, 770),
  'plank': (1306, 0, 1500, 150), 'scissors': (1150, 130, 1540, 800), 'jack': (1497, 120, 1680, 350), 'floor_dark': (0, 800, 1500, 946)}
for k, (x0, y0, x1, y1) in regions.items():
    d = np.abs(b(R) - b(T6))[y0:y1, x0:x1]; print(f'{k:12s} mae {d.mean()*255:6.1f}  render {b(R)[y0:y1,x0:x1].mean()*255:6.1f}  src {b(T6)[y0:y1,x0:x1].mean()*255:6.1f}')
for k, (x0, y0, x1, y1) in {'rcab': (1690, 0, 1800, 790), 'far_right': (1800, 0, 2206, 790), 'boxes': (2020, 0, 2206, 760), 'floor_lit_mid': (1000, 800, 1700, 946), 'floor_lit_l': (300, 800, 1000, 946), 'floor_lit_r': (1700, 800, 2206, 946)}.items():
    d = np.abs(b(RL) - b(TL))[y0:y1, x0:x1]; print(f'{k:12s} mae {d.mean()*255:6.1f}  render {b(RL)[y0:y1,x0:x1].mean()*255:6.1f}  src {b(TL)[y0:y1,x0:x1].mean()*255:6.1f}')
out = np.vstack([np.hstack([R, T6]), np.hstack([RL, TL])])
cv2.imwrite('../s19b-study/room_cmp.jpg', cv2.resize((np.clip(out, 0, 1) * 255).astype(np.uint8), None, fx=0.45, fy=0.45, interpolation=cv2.INTER_AREA))
cv2.imwrite('../s19b-study/room_r.png', (np.clip(R, 0, 1) * 255).astype(np.uint8))
