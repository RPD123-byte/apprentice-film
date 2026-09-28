# reg.py renderdir frames  -> patch phase-correlation offsets (render->source), grid of patches
import cv2,numpy as np,sys
rd=sys.argv[1]; frs=[int(f) for f in sys.argv[2].split(',')]
def L(p): return cv2.GaussianBlur(cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.5)
for f in frs:
  a=L(f'{rd}/r{f}.png'); b=L(f'snapshots/s08-rev1-src/f{f}.png')
  out=[]
  for (x,y) in [(300,300),(800,300),(1300,300),(1700,300),(2000,300),(300,700),(800,700),(1300,700),(1700,700),(2000,700)]:
    w=256; A=a[y-w//2:y+w//2,x-w//2:x+w//2]; B=b[y-w//2:y+w//2,x-w//2:x+w//2]
    win=cv2.createHanningWindow((w,w),cv2.CV_32F)
    (dx,dy),r=cv2.phaseCorrelate(A,B,win)
    out.append('(%d,%d):%+.1f,%+.1f r%.2f'%(x,y,dx,dy,r))
  print(f, ' '.join(out))
