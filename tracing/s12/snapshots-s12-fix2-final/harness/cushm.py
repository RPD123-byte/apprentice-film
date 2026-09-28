import cv2, numpy as np, sys
d = sys.argv[1]
for t, f in (('34.0', 850), ('35.2', 880), ('35.3', 882)):
  import os
  if not os.path.exists(f'{d}/r-{t}.png'): continue
  out = []
  for nm, p in (('ren', f'{d}/r-{t}.png'), ('src', f'src-{f}.png')):
    a = cv2.imread(p, 0).astype(np.float32)
    x0, y0, x1, y1 = 1232, 180, 1268, 330
    c = a[y0:y1, x0:x1]; hp = np.abs(a - cv2.GaussianBlur(a, (0, 0), 1.5))[y0:y1, x0:x1].mean()
    out.append(f'{nm}: hp {hp:.1f} >180 {100*(c>180).mean():.1f}% std {c.std():.0f} mean {c.mean():.0f}')
  print(t, ' | '.join(out))
