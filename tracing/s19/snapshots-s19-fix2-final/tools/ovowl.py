# ovowl.py tag t1,t2,.. x0,y0,x1,y1 [scale] : per t: source crop + 50px grid + red contour of the rendered owl layer | render crop
import sys; sys.path.insert(0, '.')
from lab import *
import numpy as np, cv2
tag=sys.argv[1]; ts=[float(v) for v in sys.argv[2].split(',')]; x0,y0,x1,y1=[int(v) for v in sys.argv[3].split(',')]
sc=float(sys.argv[4]) if len(sys.argv)>4 else 1.0
L=Lab(); tiles=[]
for t in ts:
    o=L.devc('owlc',{'t':t}); a=(o[:,:,3]>100).astype(np.uint8)
    r=L.render(t); s=src(t).copy()
    ov=(s*0.85).astype(np.uint8)
    for x in range((x0//50+1)*50,x1,50): cv2.line(ov,(x,y0),(x,y1),(0,200,0) if x%100 else (0,255,255),1)
    for y in range((y0//50+1)*50,y1,50): cv2.line(ov,(x0,y),(x1,y),(0,200,0) if y%100 else (0,255,255),1)
    cs,_=cv2.findContours(a,cv2.RETR_LIST,cv2.CHAIN_APPROX_NONE); cv2.drawContours(ov,cs,-1,(0,0,255),2)
    im=np.hstack([ov[y0:y1,x0:x1],r[y0:y1,x0:x1]])
    if sc!=1: im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
    cv2.putText(im,f'{t:.2f} mae {mae(r,src(t),8):.2f}',(6,24),0,0.8,(0,0,255),2)
    tiles.append(im)
L.close()
cv2.imwrite(f'../s19-fix2-{tag}.jpg',np.vstack(tiles),[cv2.IMWRITE_JPEG_QUALITY,85]); print('ok')
