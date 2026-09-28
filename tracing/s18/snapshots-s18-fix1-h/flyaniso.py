import cv2,numpy as np,math,sys,os,json
sys.path.insert(0,'../../src/shots/s18/trace2'); os.environ['S18SRC']='/Users/computer/rootline/apprentice-film/snapshots/s18-fix1-src/'
from common import pre
from flyfit_k import linek
DIRS={1419:90,1420:205,1421:205,1422:205,1423:205,1424:125,1425:125,1427:125,1429:125,1430:125}
def eratio(im,th,m):
    gx=cv2.Sobel(im,cv2.CV_32F,1,0); gy=cv2.Sobel(im,cv2.CV_32F,0,1)
    c,s=math.cos(th),math.sin(th); gp=gx*c+gy*s; gn=-gx*s+gy*c
    return (gp*gp)[m].mean()/((gn*gn)[m].mean()+1e-9)
out={}
for n,thd in DIRS.items():
    th=math.radians(thd)
    Cb=cv2.imread('ffit/r%d.png'%(10000+n),0).astype(np.float32)/255; Cw=cv2.imread('ffit/r%d.png'%(20000+n),0).astype(np.float32)/255
    P=cv2.imread('ffit/r%d.png'%(30000+n),0).astype(np.float32)/255
    a=np.clip(1-(Cw-Cb),0,1); S=pre(n)
    m=(cv2.GaussianBlur(S,(0,0),4)>0.35)&(cv2.erode((a>0.9).astype(np.uint8),np.ones((15,15),np.uint8))>0)
    if m.sum()<3000: continue
    rs=eratio(S,th,m); row=[]
    for p in (4,8):
      for L in (0,10,20,30,40):
        k=linek(L,th); c=cv2.filter2D(Cb,-1,k); aa=cv2.filter2D(a,-1,k); sg=0.707*math.sqrt(p)
        c=cv2.GaussianBlur(c,(0,0),sg); aa=cv2.GaussianBlur(aa,(0,0),sg); o=c+(1-aa)*P
        e2=np.abs(cv2.GaussianBlur(o,(0,0),2)-cv2.GaussianBlur(S,(0,0),2))[m].mean()*255
        row.append((p,L,eratio(o,th,m),e2))
    print(n,'dir',thd,'src par/perp %.2f |'%rs,' '.join('p%d L%d %.2f e2 %.1f'%r for r in row))
