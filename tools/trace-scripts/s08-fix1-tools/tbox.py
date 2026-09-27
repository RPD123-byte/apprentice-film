import cv2,numpy as np,sys
rd=sys.argv[1]
for f in [int(x) for x in sys.argv[2].split(',')]:
  for nm,p in [('ren',f'{rd}/r{f}.png'),('src',f'snapshots/s08-rev1-src/f{f}.png')]:
    g=cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY).astype(float)
    # text region relative to the card: locate via frame-specific box
    x0,y0,x1,y1=map(int,sys.argv[3:7])
    r=g[y0:y1,x0:x1]; bgv=np.median(r); m=r<bgv-45
    ys,xs=np.where(m)
    vals=np.sort(r[m])
    print(f,nm,'bbox x %d-%d y %d-%d'%(xs.min()+x0,xs.max()+x0,ys.min()+y0,ys.max()+y0),'bg %.0f min %.0f p2 %.0f p10 %.0f n %d'%(bgv,vals[0],vals[int(len(vals)*0.02)],vals[int(len(vals)*0.1)],m.sum()))
