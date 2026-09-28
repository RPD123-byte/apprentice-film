# sgrid.py TAG [TAG2] x0 y0 x1 y1 [cell] : signed blurred luminance error (render - source mean) per cell, page units
import sys, cv2, numpy as np
args = sys.argv[1:]; tags = [a for a in args if not a.lstrip('-').isdigit()]; nums = [int(a) for a in args if a.lstrip('-').isdigit()]
x0, y0, x1, y1 = nums[:4]; c = nums[4] if len(nums) > 4 else 50
b = cv2.imread('s07-bt/src_screen_mean.png').astype(np.float32)
bl = lambda x: cv2.GaussianBlur(x.astype(np.float32), (0, 0), 12)
for t in tags:
  a = cv2.imread(f's07-bp/{t}/rect.png').astype(np.float32)
  e = (bl(a) - bl(b)).mean(2); ea = np.abs(bl(a) - bl(b)).mean(2)
  print(t, 'abs mean %.2f' % ea[y0:y1, x0:x1].mean())
  print('       ' + ' '.join('%4d' % x for x in range(x0, x1, c)))
  for y in range(y0, y1, c): print('  %4d ' % y + ' '.join('%+4d' % e[y:y+c, x:x+c].mean() for x in range(x0, x1, c)))
