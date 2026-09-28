# regview.py FRAME T x0 y0 x1 y1 scale out.jpg -- source crop with every bright region outlined and numbered (region id)
import cv2,numpy as np,sys
from regions import label
f,T=int(sys.argv[1]),int(sys.argv[2]); x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; sc=float(sys.argv[7]); out=sys.argv[8]
lab,st,cen,ink=label(f,T,(0,0,2206,946))
g=cv2.imread(f'../s25-src/f{f:05d}.png')
c=cv2.resize(g[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
sub=lab[y0:y1,x0:x1]
ids=[i for i in np.unique(sub) if i>0 and st[i,4]>=40]
rng=np.random.RandomState(7)
for i in ids:
    m=(sub==i).astype(np.uint8)
    m=cv2.resize(m,(c.shape[1],c.shape[0]),interpolation=cv2.INTER_NEAREST)
    cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    col=tuple(int(v) for v in rng.randint(0,255,3))
    cv2.drawContours(c,cs,-1,col,1)
    ys,xs=np.nonzero(m)
    if len(xs)==0: continue
    j=len(xs)//2
    k=np.argmin((xs-xs.mean())**2+(ys-ys.mean())**2)
    cv2.putText(c,str(i),(int(xs[k]),int(ys[k])),0,0.35,(0,255,255),1)
for x in range((x0//50+1)*50,x1,50):
    X=int((x-x0)*sc); cv2.putText(c,str(x),(X+2,10),0,0.35,(255,255,0),1); cv2.line(c,(X,0),(X,8),(255,255,0),1)
for y in range((y0//50+1)*50,y1,50):
    Y=int((y-y0)*sc); cv2.putText(c,str(y),(2,Y),0,0.35,(255,255,0),1); cv2.line(c,(0,Y),(8,Y),(255,255,0),1)
cv2.imwrite(out,c)
