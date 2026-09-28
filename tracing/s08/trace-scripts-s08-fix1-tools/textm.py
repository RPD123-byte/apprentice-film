import cv2,numpy as np,sys
rd=sys.argv[1]
for nm,p in [('ren',rd+'/r765.png'),('src','snapshots/s08-rev1-src/f765.png')]:
  im=cv2.imread(p).astype(float); L=im.mean(-1)
  hsv=cv2.cvtColor(im.astype(np.uint8),cv2.COLOR_BGR2HSV); S=hsv[...,1]/255
  m=(L>110)&(S<0.3)
  # line 1 rows 330-420, x 150-800 ; line 2 rows 425-482, x 100-560
  for (y0,y1,x0,x1) in [(320,425,120,800),(425,482,100,560)]:
    mm=m[y0:y1,x0:x1]; ys,xs=np.nonzero(mm)
    rows=mm.sum(1); cols=mm.sum(0)
    yv=[y for y in range(len(rows)) if rows[y]>3]
    xv=[x for x in range(len(cols)) if cols[x]>1]
    vals=L[y0:y1,x0:x1][mm]
    print(nm,'box x %d-%d y %d-%d'%(xv[0]+x0,xv[-1]+x0,yv[0]+y0,yv[-1]+y0),'n',mm.sum(),'median L %.0f p90 %.0f'%(np.median(vals),np.percentile(vals,90)))
