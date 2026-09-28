import cv2,numpy as np,json,sys
C=json.load(open('cracks.json'))['B']; segs=np.array(C).reshape(-1,4)
rd=sys.argv[1]; f=int(sys.argv[2])
r=cv2.imread(f'{rd}/r-{f:05d}.png',0).astype(np.float32); s=cv2.imread(f'src/f{f:05d}.png',0).astype(np.float32)
prof_r=[];prof_s=[]
for x0,y0,x1,y1 in segs:
    L=np.hypot(x1-x0,y1-y0)
    if L<30: continue
    t=np.array([x1-x0,y1-y0])/L; n=np.array([-t[1],t[0]])
    for u in np.arange(8,L-8,6):
        p=np.array([x0,y0])+t*u
        if 850<p[0]<1350 or p[1]<380 or p[1]>900: continue
        pr=[];ps=[]
        for o in range(-8,9):
            q=p+n*o; xi,yi=int(round(q[0])),int(round(q[1])); pr.append(r[yi,xi]); ps.append(s[yi,xi])
        prof_r.append(pr); prof_s.append(ps)
pr=np.median(np.array(prof_r),0); ps=np.median(np.array(prof_s),0)
print('render', np.round(pr).astype(int).tolist()); print('source', np.round(ps).astype(int).tolist())
