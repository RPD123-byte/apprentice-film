import sys, cv2, numpy as np
a = cv2.imread(sys.argv[1], 0).astype(np.float32); n = int(sys.argv[2])
b = cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s07-bt/src/n{n:04d}.png', 0).astype(np.float32)
R = dict(sweater=(1700, 600, 1900, 800), owlbody=(1550, 480, 1650, 600), desk=(900, 350, 1100, 450), hand=(650, 600, 800, 700), carton=(40, 150, 200, 300), scrdark=(420, 280, 480, 330), sleeve=(1250, 620, 1400, 720), cuff=(1700, 180, 1850, 260), black=(1950, 100, 2150, 300))
for k, (x0, y0, x1, y1) in R.items():
  A = a[y0:y1, x0:x1]; B = b[y0:y1, x0:x1]
  hA = A - cv2.GaussianBlur(A, (0, 0), 1.5); hB = B - cv2.GaussianBlur(B, (0, 0), 1.5)
  mA = A - cv2.GaussianBlur(A, (0, 0), 4); mB = B - cv2.GaussianBlur(B, (0, 0), 4)
  print('%-8s mean %6.1f / %6.1f   hp1.5 std %5.1f / %5.1f   hp4 std %5.1f / %5.1f' % (k, A.mean(), B.mean(), hA.std(), hB.std(), mA.std(), mB.std()))
