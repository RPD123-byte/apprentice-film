import sys; sys.path.insert(0,'/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18fix1')
from src import *
# zoom.py out x0 y0 x1 y1 scale frames(,sep) [--reg] [--img path]
a=sys.argv; out=a[1]; x0,y0,x1,y1=map(int,a[2:6]); sc=float(a[6])
if '--img' in a: f=cv2.imread(a[a.index('--img')+1])
else:
    fs=[int(v) for v in a[7].split(',')]
    acc=None
    for n in fs:
        g=frame(n).astype(np.float32)
        if '--reg' in a:
            dx,dy=PATH_A[n]; g=cv2.warpAffine(g,np.float32([[1,0,-dx],[0,1,-dy]]),(2206,946))
        acc=g if acc is None else acc+g
    f=(acc/len(fs)).astype(np.uint8)
c=cv2.resize(f[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
step=10 if sc>=3 else 25 if sc>=2 else 50
for x in range((x0//step+1)*step,x1,step):
    X=int((x-x0)*sc); big=x%50==0
    cv2.line(c,(X,0),(X,14 if big else 6),(0,0,255),2 if big else 1)
    if big: cv2.putText(c,str(x),(X+2,26),0,0.5,(0,0,255),1)
    cv2.line(c,(X,c.shape[0]-1),(X,c.shape[0]-(14 if big else 6)),(0,0,255),2 if big else 1)
for y in range((y0//step+1)*step,y1,step):
    Y=int((y-y0)*sc); big=y%50==0
    cv2.line(c,(0,Y),(14 if big else 6,Y),(0,0,255),2 if big else 1)
    if big: cv2.putText(c,str(y),(16,Y+5),0,0.5,(0,0,255),1)
    cv2.line(c,(c.shape[1]-1,Y),(c.shape[1]-(14 if big else 6),Y),(0,0,255),2 if big else 1)
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,90])
