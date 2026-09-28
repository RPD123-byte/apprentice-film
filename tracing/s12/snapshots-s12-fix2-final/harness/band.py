import cv2, numpy as np, sys
R = {'forehead': (860, 170, 990, 280), 'cheekL': (720, 460, 840, 560), 'cheekR': (1020, 470, 1140, 570), 'crown': (990, 110, 1220, 290), 'wing': (1480, 430, 1720, 680), 'tail': (1780, 750, 1920, 840), 'belly': (1000, 700, 1300, 850)}
def band(a):
  return cv2.GaussianBlur(a, (0,0), 0.8) - cv2.GaussianBlur(a, (0,0), 1.8)
for d in sys.argv[1:]:
  a = cv2.imread(f'{d}/r-34.0.png', 0).astype(np.float32); b = cv2.imread('src-850.png', 0).astype(np.float32)
  A, B = band(a), band(b)
  print(d, ' '.join(f'{k} {A[y0:y1,x0:x1].std():.1f}/{B[y0:y1,x0:x1].std():.1f}' for k, (x0,y0,x1,y1) in R.items()))
