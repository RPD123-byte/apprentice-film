import cv2, numpy as np, sys
im=cv2.imread(sys.argv[1]); g=cv2.GaussianBlur(cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(float),(0,0),1.0)
def fitline(pts):  # x = a*y + b  or y = a*x+b
    pts=np.array(pts); return np.polyfit(pts[:,0],pts[:,1],1)
thr=205
L=[];R=[];T=[];B=[]
for y in range(300,660,6):
    row=g[y,1150:1360]; i=np.argmax(row>thr); L.append((y,1150+i-0.5))
for y in range(260,560,6):
    row=g[y,1380:1560]; idx=np.nonzero(row>thr)[0]; R.append((y,1380+idx[-1]+0.5))
for x in range(1330,1480,6):
    col=g[150:330,x]; i=np.argmax(col>thr); T.append((x,150+i-0.5))
for x in range(1245,1340,6):
    col=g[600:760,x]; idx=np.nonzero(col>thr)[0]; B.append((x,600+idx[-1]+0.5))
aL=fitline(L); aR=fitline(R); aT=fitline(T); aB=fitline(B)
print('left x=%.4f*y+%.2f'%tuple(aL)); print('right x=%.4f*y+%.2f'%tuple(aR)); print('top y=%.4f*x+%.2f'%tuple(aT)); print('bot y=%.4f*x+%.2f'%tuple(aB))
def ix(aV,aH):  # x = p*y+q ; y = r*x+s
    p,q=aV; r,s=aH; y=(r*q+s)/(1-r*p); return (p*y+q,y)
for n,(v,h) in dict(TL=(aL,aT),TR=(aR,aT),BL=(aL,aB),BR=(aR,aB)).items(): print(n,'%.1f %.1f'%ix(v,h))
res=lambda P,a:[abs(np.polyval(a,p[0])-p[1]) for p in P]
print('resid',max(res(L,aL)),max(res(R,aR)),max(res(T,aT)),max(res(B,aB)))
