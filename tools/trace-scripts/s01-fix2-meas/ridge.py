# ridge.py T x0 y0 x1 y1 out.jpg [minlen] [thr]: dark ink lines of the SOURCE at T in a plate region -> skeleton polylines (plate coords)
import sys, cv2, numpy as np
from skimage.morphology import skeletonize
exec(open('/Users/computer/rootline/apprentice-film/snapshots/s01-fix1-meas/camlib.py').read())
T=float(sys.argv[1]); x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; out=sys.argv[6]
minlen=float(sys.argv[7]) if len(sys.argv)>7 else 12; thr=float(sys.argv[8]) if len(sys.argv)>8 else 28
Z=4
g=cv2.cvtColor(plate_frame(T,x0,y0,x1,y1,Z),cv2.COLOR_BGR2GRAY).astype(np.float32)
g=cv2.GaussianBlur(g,(0,0),2)
bh=cv2.morphologyEx(g,cv2.MORPH_BLACKHAT,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(31,31)))
m=bh>thr
sk=skeletonize(m)
# trace skeleton into polylines
H,W=sk.shape; seen=np.zeros_like(sk,bool)
nb=[(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]
def deg(y,x): return sum(1 for dy,dx in nb if 0<=y+dy<H and 0<=x+dx<W and sk[y+dy,x+dx])
pts=np.argwhere(sk)
ends=[(y,x) for y,x in pts if deg(y,x)==1]
lines=[]
def walk(y,x):
    path=[(y,x)]; seen[y,x]=True
    while True:
        nxt=None
        for dy,dx in nb:
            yy,xx=y+dy,x+dx
            if 0<=yy<H and 0<=xx<W and sk[yy,xx] and not seen[yy,xx]: nxt=(yy,xx); break
        if nxt is None: break
        y,x=nxt; seen[y,x]=True; path.append((y,x))
    return path
for y,x in ends:
    if not seen[y,x]: lines.append(walk(y,x))
for y,x in pts:
    if not seen[y,x]: lines.append(walk(y,x))
vis=cv2.cvtColor(np.clip(g,0,255).astype(np.uint8),cv2.COLOR_GRAY2BGR)//2+127
k=0
for L in lines:
    if len(L)/Z<minlen: continue
    a=np.array([[x,y] for y,x in L],np.float32).reshape(-1,1,2)
    s=cv2.approxPolyDP(a,1.5*Z,False).reshape(-1,2)
    P=[(round(x0+px/Z),round(y0+py/Z)) for px,py in s]
    wv=float(np.mean([bh[y,x] for y,x in L]))
    col=tuple(int(c) for c in np.random.RandomState(k).randint(0,200,3))
    for i in range(len(s)-1): cv2.line(vis,tuple(map(int,s[i])),tuple(map(int,s[i+1])),col,2)
    cv2.putText(vis,str(k),tuple(map(int,s[0])),0,0.45,(0,0,255),1)
    print(k, f'len={len(L)/Z:.0f} dark={wv:.0f}', P)
    k+=1
for x in range((x0//10+1)*10,x1,10):
    X=int((x-x0)*Z); cv2.line(vis,(X,0),(X,vis.shape[0]),(200,230,255),1)
    if x%50==0: cv2.putText(vis,str(x),(X+2,12),0,0.4,(255,0,200),1)
for y in range((y0//10+1)*10,y1,10):
    Y=int((y-y0)*Z); cv2.line(vis,(0,Y),(vis.shape[1],Y),(200,230,255),1)
    if y%50==0: cv2.putText(vis,str(y),(2,Y-2),0,0.4,(255,0,200),1)
cv2.imwrite(out,vis,[cv2.IMWRITE_JPEG_QUALITY,90])
