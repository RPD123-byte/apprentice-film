import cv2,numpy as np,math,sys,os,json
sys.path.insert(0,'../../src/shots/s18/trace2'); os.environ['S18SRC']='/Users/computer/rootline/apprentice-film/snapshots/s18-fix1-src/'
from common import pre
from flyfit_k import linek
def energies(im,m):
    gx=cv2.Sobel(im,cv2.CV_32F,1,0); gy=cv2.Sobel(im,cv2.CV_32F,0,1)
    return np.array([(gx*gx)[m].mean(),(gx*gy)[m].mean(),(gy*gy)[m].mean()])
def dist(a,b):
    # compare tensors: log total energy + orientation/anisotropy (normalized)
    ta,tb=a[0]+a[2],b[0]+b[2]; na,nb=a/ta,b/tb
    return abs(math.log(ta/tb))+4*np.abs(na-nb).sum()
res={}
for n in [1419,1420,1421,1422,1423,1424,1425,1427,1429,1430]:
    Cb=cv2.imread('ffit/r%d.png'%(10000+n),0).astype(np.float32)/255; Cw=cv2.imread('ffit/r%d.png'%(20000+n),0).astype(np.float32)/255
    P=cv2.imread('ffit/r%d.png'%(30000+n),0).astype(np.float32)/255
    a=np.clip(1-(Cw-Cb),0,1); S=pre(n)
    m=cv2.dilate((cv2.GaussianBlur(S,(0,0),4)>0.35).astype(np.uint8),np.ones((9,9),np.uint8))>0
    m&=cv2.dilate((a>0.5).astype(np.uint8),np.ones((25,25),np.uint8))>0
    if m.sum()<3000: continue
    ts=energies(S,m); cand=[]
    for p in (2,4,8):
      for L in (0,8,14,20,28,36):
        for thd in (range(0,180,15) if L else [0]):
          k=linek(L,math.radians(thd)); c=cv2.filter2D(Cb,-1,k); aa=cv2.filter2D(a,-1,k); sg=0.707*math.sqrt(p)
          c=cv2.GaussianBlur(c,(0,0),sg); aa=cv2.GaussianBlur(aa,(0,0),sg); o=c+(1-aa)*P
          e2=np.abs(cv2.GaussianBlur(o,(0,0),2)-cv2.GaussianBlur(S,(0,0),2))[m].mean()*255
          cand.append((dist(energies(o,m),ts),e2,p,L,thd))
    e0=[c for c in cand if c[2]==8 and c[3]==0][0]
    ok=[c for c in cand if c[1]<=e0[1]+0.4]
    b=min(ok,key=lambda c:c[0])
    print(n,'tensor dist %.3f e2 %.2f  p%d L%d th%d  | old p8 L0: dist %.3f e2 %.2f'%(b[0],b[1],b[2],b[3],b[4],e0[0],e0[1]),flush=True)
    res[n]=[b[2],b[3],b[4]]
json.dump(res,open('flyaniso2.json','w'))
