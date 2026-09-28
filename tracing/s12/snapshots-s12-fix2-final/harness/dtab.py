# python dtab.py raw.png x0 y0 x1 y1 step [sigma] -> table of (render_raw - source_prefinish) blurred
import cv2, numpy as np, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/src/shots/s12/trace'); from degrade import degrade
fr = {'34.0': 850, '35.2': 880, '35.3': 882}
r = sys.argv[1]; t = r.split('-')[-1][:-4]
src = degrade(cv2.imread(f'src-{fr[t]}.png', 0).astype(np.float32), t=float(t))
ren = cv2.imread(r, 0).astype(np.float32)
x0, y0, x1, y1, st = map(int, sys.argv[2:7]); sg = float(sys.argv[7]) if len(sys.argv) > 7 else 3
a, b = cv2.GaussianBlur(ren, (0, 0), sg), cv2.GaussianBlur(src, (0, 0), sg)
print('     ' + ' '.join('%4d' % x for x in range(x0, x1, st)))
for y in range(y0, y1, st):
  print('%4d ' % y + ' '.join('%+4d' % (a[y, x] - b[y, x]) for x in range(x0, x1, st)))
