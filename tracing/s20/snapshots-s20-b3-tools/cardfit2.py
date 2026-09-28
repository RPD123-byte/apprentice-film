import cv2, numpy as np, sys
im=cv2.imread(sys.argv[1]); g=cv2.GaussianBlur(cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(float),(0,0),0.8)
cx=int(sys.argv[2]) if len(sys.argv)>2 else 1380   # a column inside the card (below the smiley)
cy=int(sys.argv[3]) if len(sys.argv)>3 else 450
L=[];R=[];T=[];B=[]
def run(line):  # index of first < 185 walking from start
    idx=np.nonzero(line<185)[0]; return idx[0] if len(idx) else None
for y in range(cy-150,cy+200,5):
    i=run(g[y,cx::-1]); j=run(g[y,cx:])
    if i is not None: L.append((y,cx-i+0.5))
    if j is not None: R.append((y,cx+j-0.5))
for x in range(cx-60,cx+80,5):
    i=run(g[cy::-1,x])
    if i is not None: T.append((x,cy-i+0.5))
for x in range(cx-110,cx-40,5):
    j=run(g[cy:,x])
    if j is not None: B.append((x,cy+j-0.5))
def robust(P):
    P=np.array(P,float); a=np.polyfit(P[:,0],P[:,1],1)
    for _ in range(3):
        r=np.abs(np.polyval(a,P[:,0])-P[:,1]); k=r<max(1.5,np.median(r)*3); a=np.polyfit(P[k,0],P[k,1],1)
    return a,r[k].max() if k.any() else -1, k.sum(), len(P)
out={}
for n,P in dict(L=L,R=R,T=T,B=B).items():
    a,rm,k,N=robust(P); out[n]=a; print(n,'%.4f %.2f'%tuple(a),'maxres %.2f'%rm,k,'/',N)
def ix(aV,aH):
    p,q=aV; r,s=aH; y=(r*q+s)/(1-r*p); return (p*y+q,y)
for n,(v,h) in dict(TL=('L','T'),TR=('R','T'),BL=('L','B'),BR=('R','B')).items(): print(n,'%.1f %.1f'%ix(out[v],out[h]))
