import cv2,glob,re,numpy as np,sys
d=sys.argv[1]; thr=int(sys.argv[2]) if len(sys.argv)>2 else 200
fs=sorted(glob.glob(d+'/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s',p).group(1)))
def box(g):
    m=(g>thr).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(m)
    if n<2: return None
    # largest component whose centroid lies in plausible owl area
    best=None
    for i in range(1,n):
        x,y,w,h,a=st[i]
        if a<800: continue
        if best is None or a>st[best][4]: best=i
    x,y,w,h,a=st[best]; return (x,y,x+w,y+h,a,cen[best])
print('t     render x0 y0 x1 y1 area        source x0 y0 x1 y1 area        dx0 dy0 dx1 dy1')
for p in fs:
    t=float(re.search(r'at-([\d.]+)s',p).group(1))
    a=cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY); b=cv2.cvtColor(cv2.imread(p.replace('frame-','ref-')),cv2.COLOR_BGR2GRAY)
    A=box(a); B=box(b)
    if A and B: print(f'{t:5.2f}  {A[0]:4d} {A[1]:4d} {A[2]:4d} {A[3]:4d} {A[4]:6d}    {B[0]:4d} {B[1]:4d} {B[2]:4d} {B[3]:4d} {B[4]:6d}    {A[0]-B[0]:+4d} {A[1]-B[1]:+4d} {A[2]-B[2]:+4d} {A[3]-B[3]:+4d}')
