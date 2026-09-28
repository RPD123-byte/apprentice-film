import cv2, numpy as np, sys
pairs = [(t, f) for t, f in [('33.6', 840), ('34.0', 850), ('35.16', 879), ('35.2', 880), ('35.24', 881), ('35.28', 882), ('35.32', 883)]]
def m(R, S):
  x0, y0, x1, y1 = 640, 0, 1960, 946
  b = lambda a, s: cv2.GaussianBlur(a, (0, 0), s)[y0:y1, x0:x1]
  s12 = np.abs(b(R, 12) - b(S, 12)).mean(); s3 = np.abs(b(R, 3) - b(S, 3)).mean()
  mr, ms = b(R, 2) > 90, b(S, 2) > 90
  return s12, s3, (mr & ms).sum() / (mr | ms).sum()
for d in sys.argv[1:]:
  for t, f in pairs:
    try: R = cv2.imread('%s/r-%s.png' % (d, t), 0).astype(np.float32)
    except Exception: continue
    S = cv2.imread('src-%d.png' % f, 0).astype(np.float32)
    print(d, t, f, 'sigma12 %.2f  sigma3 %.2f  IoU %.3f' % m(R, S))
