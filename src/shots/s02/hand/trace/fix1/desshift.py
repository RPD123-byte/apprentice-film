# the designer's offset against the source in the pans: NCC of blurred gradient maps inside his mask, over shifts
import sys, numpy as np, cv2
from run import Lab, src
fr=[int(v) for v in sys.argv[1].split(',')]
L=Lab()
def gm(im):
    g=cv2.GaussianBlur(cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),2.5)
    return np.hypot(cv2.Sobel(g,cv2.CV_32F,1,0),cv2.Sobel(g,cv2.CV_32F,0,1))
for f in fr:
    L.js('(o)=>window.__labset(o)',{'only':{'chars':True,'desOnly':True},'desbK':0})
    d,_=L.frame(f,False); L.js('(o)=>window.__labset(o)',{'only':None,'desbK':None})
    m=(cv2.cvtColor(d,cv2.COLOR_BGR2GRAY)>20).astype(np.uint8); m=cv2.erode(m,np.ones((31,31),np.uint8))
    # face zone only: exclude the hoodie low part and beanie? keep all
    R=gm(d); S=gm(src(f))
    ys,xs=np.nonzero(m)
    if len(xs)<5000: print(f,'none'); continue
    x0,x1,y0,y1=xs.min(),xs.max(),ys.min(),ys.max(); M=m[y0:y1,x0:x1]>0
    best=None
    for dy in range(-24,25,2):
        for dx in range(-30,31,2):
            ya,yb,xa,xb=y0+dy,y1+dy,x0+dx,x1+dx
            if ya<0 or xa<0 or yb>946 or xb>2206: continue
            a=R[y0:y1,x0:x1][M]; b=S[ya:yb,xa:xb][M]
            a=a-a.mean(); b=b-b.mean(); c=float((a*b).sum()/np.sqrt((a*a).sum()*(b*b).sum()+1e-6))
            if best is None or c>best[0]: best=(c,dx,dy)
    print(f,'source is offset from render by dx %+d dy %+d (ncc %.3f)'%(best[1],best[2],best[0]),flush=True)
L.close()
