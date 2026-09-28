import cv2,numpy as np,math,sys,os,json
sys.path.insert(0,'../../src/shots/s18/trace2'); os.environ['S18SRC']='/Users/computer/rootline/apprentice-film/snapshots/s18-fix1-src/'
from common import pre
def linek(L,th):
    if L<1: return np.ones((1,1),np.float32)
    n=int(L*4)+1; R=int(math.ceil(L/2))+2; k=np.zeros((2*R+1,2*R+1),np.float32)
    for i in range(n):
        u=i/(n-1)-0.5; x=R+u*L*math.cos(th); y=R+u*L*math.sin(th)
        x0=int(math.floor(x)); y0=int(math.floor(y)); fx=x-x0; fy=y-y0
        k[y0,x0]+=(1-fx)*(1-fy); k[y0,x0+1]+=fx*(1-fy); k[y0+1,x0]+=(1-fx)*fy; k[y0+1,x0+1]+=fx*fy
    return k/k.sum()
res={}
for n in range(1419,1433):
    if n==1426: continue
    Cb=cv2.imread('ffit/r%d.png'%(10000+n),0).astype(np.float32)/255; Cw=cv2.imread('ffit/r%d.png'%(20000+n),0).astype(np.float32)/255
    P=cv2.imread('ffit/r%d.png'%(30000+n),0).astype(np.float32)/255
    a=np.clip(1-(Cw-Cb),0,1); S=pre(n)
    m=cv2.dilate((a>0.05).astype(np.uint8),np.ones((31,31),np.uint8))>0
    best=None; rows=[]
    for p in (1,2,4,8):
        sig=0.707*math.sqrt(p)
        for L in (0,8,14,20,28,36,46):
            for thd in (range(0,180,15) if L else [0]):
                k=linek(L,math.radians(thd))
                c=cv2.filter2D(Cb,-1,k,borderType=cv2.BORDER_REPLICATE); aa=cv2.filter2D(a,-1,k,borderType=cv2.BORDER_REPLICATE)
                c=cv2.GaussianBlur(c,(0,0),sig); aa=cv2.GaussianBlur(aa,(0,0),sig)
                out=c+(1-aa)*P
                e2=np.abs(cv2.GaussianBlur(out,(0,0),2)-cv2.GaussianBlur(S,(0,0),2))[m].mean()*255
                e6=np.abs(cv2.GaussianBlur(out,(0,0),6)-cv2.GaussianBlur(S,(0,0),6))[m].mean()*255
                sc=e2+0.5*e6
                rows.append((sc,e2,e6,p,L,thd))
                if best is None or sc<best[0]: best=(sc,e2,e6,p,L,thd)
    base=[r for r in rows if r[3]==8 and r[4]==0][0]
    print(n,'best e2 %.2f e6 %.2f passes %d L %d th %d | softHalf8-only e2 %.2f e6 %.2f'%(best[1],best[2],best[3],best[4],best[5],base[1],base[2]),flush=True)
    res[n]=best[3:]
json.dump(res,open('flyfit.json','w'))
