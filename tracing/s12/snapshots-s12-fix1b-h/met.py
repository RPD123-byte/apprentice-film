# met.py render.png source.png [dx dy]  -> per-region metrics (finished frames): sigma-3 / sigma-12 MAE, gradient energy
import cv2, numpy as np, sys
R = cv2.imread(sys.argv[1], 0).astype(np.float32); S = cv2.imread(sys.argv[2], 0).astype(np.float32)
B = {'owl': (640, 0, 1960, 946), 'cup': (1260, 90, 1480, 420), 'cupT': (1262, 160, 1440, 420), 'metal': (1262, 160, 1345, 400), 'beak': (880, 440, 1080, 620), 'tuft': (1180, 95, 1275, 235),
     'plaster': (715, 95, 955, 235), 'flank': (1380, 700, 1770, 900), 'tail': (1700, 720, 1960, 880), 'footR': (1300, 880, 1450, 946),
     'crown': (1000, 55, 1180, 110), 'eyes': (700, 250, 1110, 470), 'wing': (1250, 400, 1770, 800), 'belly': (900, 580, 1400, 900),
     'head': (680, 60, 1300, 600), 'lefted': (640, 250, 800, 700)}
def blur(a, s): return cv2.GaussianBlur(a, (0, 0), s)
def grad(a): return np.hypot(cv2.Sobel(a, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(a, cv2.CV_32F, 0, 1, ksize=3))
r3, s3, r12, s12, gr, gs = blur(R, 3), blur(S, 3), blur(R, 12), blur(S, 12), grad(R), grad(S)
only = sys.argv[3].split(',') if len(sys.argv) > 3 else None
for k, (x0, y0, x1, y1) in B.items():
  if only and k not in only: continue
  sl = np.s_[y0:y1, x0:x1]
  print('%-8s s3 %5.2f  s12 %5.2f  grad %5.1f/%5.1f  mean %5.1f/%5.1f' % (k, np.abs(r3[sl] - s3[sl]).mean(), np.abs(r12[sl] - s12[sl]).mean(), gr[sl].mean(), gs[sl].mean(), R[sl].mean(), S[sl].mean()))
