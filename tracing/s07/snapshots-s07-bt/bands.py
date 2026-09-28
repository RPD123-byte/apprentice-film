# bands.py IMG : per-column hue-class runs (page units) of the lower rainbow, x 0..700
import sys, cv2, numpy as np
def classes(img):
  R = cv2.GaussianBlur(img, (0, 0), 2)
  h = cv2.cvtColor(R, cv2.COLOR_BGR2HSV_FULL).astype(np.float32)
  H = h[..., 0] * 360 / 256; S = h[..., 1] / 255; V = h[..., 2] / 255
  Hh = np.where(H > 350, H - 360, H)
  cls = np.zeros(H.shape, np.uint8); sat = (S > 0.3) & (V > 0.25)
  for k, (a, bb) in [(1, (35, 70)), (2, (12, 35)), (3, (-10, 12)), (4, (300, 350)), (5, (230, 300))]: cls[sat & (Hh >= a) & (Hh < bb)] = k
  return cls
N = 'xYORMP'
def runs(cls, x, y0=360, y1=1000):
  col = cls[y0:y1, x]; out = []; cur = col[0]; st = y0
  for i, v in enumerate(col[1:], 1):
    if v != cur:
      if cur and i + y0 - st >= 6: out.append('%s%d-%d' % (N[cur], st, i + y0))
      cur = v; st = i + y0
  return ' '.join(out)
if __name__ == '__main__':
  A = classes(cv2.imread(sys.argv[1])); B = classes(cv2.imread('s07-bt/src_screen_mean.png'))
  for x in range(10, 700, 40): print('x%4d  R: %-60s\n       S: %s' % (x, runs(A, x), runs(B, x)))
