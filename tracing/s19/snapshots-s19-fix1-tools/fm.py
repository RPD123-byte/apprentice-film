import cv2, sys
from lab import src
d=sys.argv[1]; t=float(sys.argv[2])
r=cv2.imread(f'{d}/r-{t:.2f}.png',0).astype(float); s=src(t,True).astype(float)
for nm,b in [('L',(0,790,600,946)),('R',(1750,790,2206,946)),('C',(1300,800,1700,946)),('Lnear',(0,790,600,830)),('M',(700,800,1100,946)),('R2',(1700,800,2000,946))]:
    x0,y0,x1,y1=b; print(nm, round(r[y0:y1,x0:x1].mean(),1), round(s[y0:y1,x0:x1].mean(),1))
