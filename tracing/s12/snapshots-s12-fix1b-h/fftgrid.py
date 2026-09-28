import cv2, numpy as np, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/src/shots/s12/trace')
from degrade import degrade
img = sys.argv[1]; isrc = img.endswith('src-850.png')
a = cv2.imread(img, 0).astype(np.float32)
if isrc: a = degrade(a)
N = 64
yy, xx = np.mgrid[0:N, 0:N] - N // 2
per = N / np.maximum(np.hypot(xx, yy), 1e-6); band = (per > 3.3) & (per < 5.8)
win = np.outer(np.hanning(N), np.hanning(N))
hp = a - cv2.GaussianBlur(a, (0, 0), 2.5)
loc = cv2.GaussianBlur(a, (0, 0), 6)
ok = (a > loc - 20) & (loc > 190)          # plumage paper, away from strokes and shade
print('      ' + ' '.join('%7d' % x for x in range(700, 1800, 80)))
for y in range(80, 880, 80):
  row = []
  for x in range(700, 1800, 80):
    m = ok[y:y + N, x:x + N]
    if m.mean() < 0.5: row.append('   .   '); continue
    p = hp[y:y + N, x:x + N] * m
    F = np.abs(np.fft.fftshift(np.fft.fft2(p * win))) ** 2; F[~band] = 0
    i = np.argmax(F); fy, fx = divmod(i, N); fy -= N // 2; fx -= N // 2
    ang = np.degrees(np.arctan2(fy, fx)) % 180; amp = np.sqrt(F.sum() / m.sum()) / 10
    row.append('%3.0f/%3.1f' % (ang, amp))
  print('%5d ' % y + ' '.join(row))
