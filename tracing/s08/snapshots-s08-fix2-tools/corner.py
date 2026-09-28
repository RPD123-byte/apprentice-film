# corner.py RDIR frames : paper-edge (level 150) crossings round the card's corners, source vs render (F0), and circle fits
import cv2,numpy as np,sys
sys.path.insert(0,'snapshots/s08-fix2-tools')
from cam import f0
from scipy.optimize import least_squares
rd=sys.argv[1]; fr=[int(v) for v in (sys.argv[2] if len(sys.argv)>2 else '764,765,766,767').split(',')]
L=lambda im: im[...,2]*0.299+im[...,1]*0.587+im[...,0]*0.114
S=L(np.mean([f0(cv2.imread(f'snapshots/s08-p4-src/f{k}.png').astype(np.float32),k) for k in fr],0))
R=L(np.mean([f0(cv2.imread(f'{rd}/r{k}.png').astype(np.float32),k) for k in fr],0))
LEV=150
def rowx(I,y,xin,step):  # scan from inside (xin) outward by step (+-1) until < LEV
    x=xin
    while I[y,x]>=LEV: x+=step
    a,b=I[y,x-step],I[y,x]; return x-step+step*(a-LEV)/(a-b)
def coly(I,x,yin,step):
    y=yin
    while I[y,x]>=LEV: y+=step
    a,b=I[y-step,x],I[y,x]; return y-step+step*(a-LEV)/(a-b)
def pts(I,corner):
    P=[]
    if corner=='TL':
        for y in range(186,236,2): P.append((rowx(I,y,1520,-1),y))
        for x in range(1454,1504,2): P.append((x,coly(I,x,215,-1)))
    if corner=='BL':
        for y in range(782,829,2): P.append((rowx(I,y,1476,-1),y))
        for x in range(1454,1500,2): P.append((x,coly(I,x,805,1)))
    if corner=='TR':
        for y in range(186,232,2): P.append((rowx(I,y,1890,1),y))
        for x in range(1866,1912,2): P.append((x,coly(I,x,215,-1)))
    if corner=='BR':
        for y in range(785,829,2): P.append((rowx(I,y,1890,1),y))
        for x in range(1866,1912,2): P.append((x,coly(I,x,805,1)))
    return np.array(P,float)
# straight edges
def straight(I):
    l=np.median([rowx(I,y,1475,-1) for y in range(300,700,5)]); r=np.median([rowx(I,y,1890,1) for y in range(300,700,5)])
    t=np.median([coly(I,x,215,-1) for x in list(range(1530,1595,4))+list(range(1790,1850,4))]); b=np.median([coly(I,x,805,1) for x in range(1540,1820,5)])
    return l,r,t,b
for nm,I in (('S',S),('R',R)):
    l,r,t,b=straight(I); print(nm,'edges L %.2f R %.2f T %.2f B %.2f'%(l,r,t,b))
    for c in ('TL','TR','BR','BL'):
        P=pts(I,c)
        cx=l if c[1]=='L' else r; cy=t if c[0]=='T' else b
        sx=1 if c[1]=='L' else -1; sy=1 if c[0]=='T' else -1
        # keep points in the corner (beyond the straight edges by >0.3)
        def res(p):
            rr=p[0]; ox=cx+sx*rr; oy=cy+sy*rr
            q=P[(np.abs(P[:,0]-cx)>0.3)&(np.abs(P[:,1]-cy)>0.3)]
            q=q[((q[:,0]-ox)*sx<0)&((q[:,1]-oy)*sy<0)]
            return np.hypot(q[:,0]-ox,q[:,1]-oy)-rr
        f=least_squares(res,[45.0])
        print('  ',c,'r %.2f'%f.x[0],'rms %.2f'%np.sqrt(np.mean(res(f.x)**2)))
if len(sys.argv)>3:
    for c in ('TL','BL'):
        a=pts(S,c); b=pts(R,c)
        print(c,'rows/cols S-R:',' '.join(f'{p[0]:.1f},{p[1]:.1f}:{(q-p)[0]+(q-p)[1]:+.2f}' for p,q in zip(b,a)))
if len(sys.argv)>4:
    for c in sys.argv[4].split(','):
        a=pts(S,c); b=pts(R,c)
        for p,q in zip(a,b): print(c,'S %.2f,%.2f  R %.2f,%.2f'%(p[0],p[1],q[0],q[1]))
for c in ('TL','BL','TR','BR'):
    a=pts(S,c); b=pts(R,c); d=(b-a).sum(1); ok=np.abs(d)<8
    print(c,'mean S-R diff (render - source, along both axes) %.2f  rms %.2f  max %.2f'%(d[ok].mean(),np.sqrt((d[ok]**2).mean()),np.abs(d[ok]).max()))
