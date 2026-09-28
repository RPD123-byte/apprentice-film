import sys, cv2, numpy as np
def classes(img):
  R = cv2.GaussianBlur(img, (0, 0), 2)
  h = cv2.cvtColor(R, cv2.COLOR_BGR2HSV_FULL).astype(np.float32)
  H = h[..., 0] * 360 / 256; S = h[..., 1] / 255; V = h[..., 2] / 255
  Hh = np.where(H > 345, H - 360, H)
  cls = np.zeros(H.shape, np.uint8); sat = (S > 0.15) & (V > 0.45)
  for k, (a, bb) in [(1, (35, 70)), (2, (5, 35)), (3, (-15, 5)), (4, (290, 345)), (5, (220, 290))]: cls[sat & (Hh >= a) & (Hh < bb)] = k
  cls[(S <= 0.15) & (V > 0.75)] = 6; cls[(V < 0.35)] = 7
  return cls
N = '?YORMPcd'
def runs(c, y, x0, x1):
  row = c[y, x0:x1]; out = []; cur = row[0]; st = x0
  for i, v in enumerate(row[1:], 1):
    if v != cur:
      if i + x0 - st >= 5: out.append('%s%d-%d' % (N[cur], st, i + x0))
      cur = v; st = i + x0
  out.append('%s%d-%d' % (N[cur], st, x1))
  return ' '.join(out)
A = classes(cv2.imread(sys.argv[1])); B = classes(cv2.imread('s07-bt/src_screen_mean.png'))
x0, x1 = int(sys.argv[2]), int(sys.argv[3])
for y in range(int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6])):
  print('y%4d R: %s\n      S: %s' % (y, runs(A, y, x0, x1), runs(B, y, x0, x1)))
