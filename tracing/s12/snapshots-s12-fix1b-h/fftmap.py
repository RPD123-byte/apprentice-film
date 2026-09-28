import cv2, numpy as np, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/src/shots/s12/trace')
from degrade import degrade
s = degrade(cv2.imread('src-850.png', 0).astype(np.float32))
r = cv2.imread(sys.argv[1], 0).astype(np.float32)
N = 48
yy, xx = np.mgrid[0:N, 0:N] - N // 2
rad = np.hypot(xx, yy); per = N / np.maximum(rad, 1e-6)
band = (per > 3.2) & (per < 6.5)
win = np.outer(np.hanning(N), np.hanning(N))
def spec(a, x, y):
  p = a[y:y + N, x:x + N].astype(np.float64); p = p - cv2.GaussianBlur(p, (0, 0), 3)
  F = np.abs(np.fft.fftshift(np.fft.fft2(p * win))); F[~band] = 0
  i = np.argmax(F); fy, fx = divmod(i, N); fy -= N // 2; fx -= N // 2
  amp = np.sqrt((F ** 2).sum()) / N / N * 4
  return np.degrees(np.arctan2(fy, fx)) % 180, N / np.hypot(fx, fy), amp
boxes = {'cheek': (760, 470), 'forehead': (900, 160), 'crownR': (1170, 230), 'crownL': (1000, 120), 'belly1': (1060, 640), 'belly2': (1180, 760), 'belly3': (980, 700),
         'chest': (880, 620), 'wingU': (1420, 480), 'wingM': (1500, 600), 'wingLL': (1380, 580), 'wingLow': (1560, 700), 'flank': (1440, 800), 'headmid': (1150, 420)}
for k, (x, y) in boxes.items():
  a1, p1, m1 = spec(s, x, y); a2, p2, m2 = spec(r, x, y)
  print('%-8s src wv %3.0f deg pitch %.1f amp %5.2f | render wv %3.0f pitch %.1f amp %5.2f | mean %3.0f/%3.0f' % (k, a1, p1, m1, a2, p2, m2, s[y:y+N, x:x+N].mean(), r[y:y+N, x:x+N].mean()))
