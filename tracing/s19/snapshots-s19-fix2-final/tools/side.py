# side.py png t x0,y0,x1,y1 out [scale] [grid] : render|source side by side with grid
import sys, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s19-fix2-tools')
from lab import src
r=cv2.imread(sys.argv[1]); t=float(sys.argv[2]); x0,y0,x1,y1=[int(v) for v in sys.argv[3].split(',')]; out=sys.argv[4]
sc=float(sys.argv[5]) if len(sys.argv)>5 else 1; gs=int(sys.argv[6]) if len(sys.argv)>6 else 50
s=src(t); im=np.hstack([r[y0:y1,x0:x1],s[y0:y1,x0:x1]])
for x in range((x0//gs+1)*gs,x1,gs):
  for off in [0,x1-x0]:
    X=x-x0+off; cv2.line(im,(X,0),(X,im.shape[0]),(0,110,0) if x%100 else (0,180,255),1)
for y in range((y0//gs+1)*gs,y1,gs): cv2.line(im,(0,y-y0),(im.shape[1],y-y0),(0,110,0) if y%100 else (0,180,255),1)
if sc!=1: im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,88])
