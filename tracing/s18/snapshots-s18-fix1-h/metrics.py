import cv2, numpy as np, sys
# metrics.py DIR [a-b] [x0 y0 x1 y1] -> per-frame blurred errors vs source (graded renders)
d=sys.argv[1]; rng=sys.argv[2] if len(sys.argv)>2 else '1331-1432'
a,b=map(int,rng.split('-')); box=list(map(int,sys.argv[3:7])) if len(sys.argv)>=7 else None
S='../s18-fix1-src/f%04d.png'
rows=[]
for n in range(a,b+1):
    r=cv2.imread('%s/r%d.png'%(d,n),0); s=cv2.imread(S%n,0)
    if r is None or s is None: continue
    r=r.astype(np.float32); s=s.astype(np.float32)
    b6=lambda x: cv2.GaussianBlur(x,(0,0),6); b2=lambda x: cv2.GaussianBlur(x,(0,0),2)
    R6,S6,R2,S2=b6(r),b6(s),b2(r),b2(s)
    if box:
        x0,y0,x1,y1=box; sl=(slice(y0,y1),slice(x0,x1))
    else: sl=(slice(None),slice(None))
    e6=np.abs(R6-S6)[sl].mean(); e2=np.abs(R2-S2)[sl].mean()
    rows.append((n,e6,e2,r[sl].mean()-s[sl].mean()))
    print(f"{n} s6={e6:5.2f} s2={e2:5.2f} dmean={r[sl].mean()-s[sl].mean():+6.2f}")
A=np.array([x[1:] for x in rows])
print('MEAN s6 %.3f max %.2f | s2 %.3f | dmean %.2f'%(A[:,0].mean(),A[:,0].max(),A[:,1].mean(),A[:,2].mean()))
