import sys, cv2, numpy as np
sys.path.insert(0,'.')
from lab import *
L=Lab()
rows=[]
for t,(cx,cy) in [(52.80,(680,448)),(52.88,(630,442)),(53.00,(549,444)),(53.12,(493,445)),(53.20,(438,450)),(49.60,(681,469)),(51.64,(671,452)),(52.44,(667,432))]:
    r=L.frame(t); s=src(t); x0,y0=cx-30,cy-30
    a=cv2.resize(r[y0:y0+60,x0:x0+60],None,fx=5,fy=5,interpolation=cv2.INTER_CUBIC); b=cv2.resize(s[y0:y0+60,x0:x0+60],None,fx=5,fy=5,interpolation=cv2.INTER_CUBIC)
    rows.append(np.hstack([a,np.full((300,4,3),(0,0,255),np.uint8),b]))
    print(t, 'cup box mae1', mae(r,s,1,(x0,y0,x0+60,y0+60)),flush=True)
cv2.imwrite(sys.argv[1],np.vstack([np.hstack(rows[:4]) if False else np.vstack(rows[:4]), ]) ,[cv2.IMWRITE_JPEG_QUALITY,88])
cv2.imwrite(sys.argv[1].replace('.jpg','_b.jpg'),np.vstack(rows[4:]),[cv2.IMWRITE_JPEG_QUALITY,88])
L.close()
