import cv2, numpy as np, sys
R='s18-rev2-h/%s/r%d.png'; S='s18-rev2-src/f%04d.png'
d=sys.argv[1] if len(sys.argv)>1 else 'fwd'
box=list(map(int,sys.argv[2:6])) if len(sys.argv)>=6 else None
rows=[]
for n in range(1326,1437):
    r=cv2.imread(R%(d,n),0); s=cv2.imread(S%n,0)
    if r is None or s is None: continue
    r=r.astype(np.float32); s=s.astype(np.float32)
    b6=lambda x: cv2.GaussianBlur(x,(0,0),6); b2=lambda x: cv2.GaussianBlur(x,(0,0),2)
    sl=(slice(box[1],box[3]),slice(box[0],box[2])) if box else (slice(None),slice(None))
    e6=np.abs(b6(r)-b6(s))[sl].mean(); e2=np.abs(b2(r)-b2(s))[sl].mean()
    rows.append((n,e6,e2,r[sl].mean()-s[sl].mean(),(r[sl]<20).mean()-(s[sl]<20).mean()))
    print(f"{n} s6={e6:5.2f} s2={e2:5.2f} dmean={r[sl].mean()-s[sl].mean():+6.2f} dblack={100*((r[sl]<20).mean()-(s[sl]<20).mean()):+5.1f}%")
a=np.array([x[1:] for x in rows if 1331<=x[0]<=1432])
print('seg mean s6 %.2f max %.2f | s2 %.2f | dmean %.2f'%(a[:,0].mean(),a[:,0].max(),a[:,1].mean(),a[:,2].mean()))
