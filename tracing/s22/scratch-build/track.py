import cv2, glob, re, numpy as np
R='/Users/computer/rootline/apprentice-film/snapshots/'
fs=[]
for d in ['s22-rev1-m1','s22-rev1-m2']:
    for p in glob.glob(R+d+'/frame-*.png'):
        t=float(re.search(r'at-([\d.]+)s',p).group(1)); r=p.replace('frame-','ref-')
        import os
        if os.path.exists(r): fs.append((t,p,r))
fs.sort()
def load(p): return cv2.GaussianBlur(cv2.imread(p,0).astype(np.float32),(0,0),2)
A=[x for x in fs if x[0]<79.72]
medR=np.median(np.stack([load(p) for t,p,r in A[::2]]),0); medS=np.median(np.stack([load(r) for t,p,r in A[::2]]),0)
k=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9))
def cen(img,med):
    m=(np.abs(img-med)>45).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,k)
    n,lab,st,cc=cv2.connectedComponentsWithStats(m)
    if n<2: return None
    i=1+np.argmax(st[1:,4]); x,y,w,h,a=st[i]
    return (cc[i][0],cc[i][1],x,y,w,h,a)
print(' t     render cx,cy  bbox(x0-x1,y0-y1) area | source cx,cy bbox area | dcx dcy')
for t,p,r in A:
    a=cen(load(p),medR); b=cen(load(r),medS)
    if a is None or b is None: print(t,a,b); continue
    print('%.2f  %6.0f %5.0f  %4d-%4d %3d-%3d %6d | %6.0f %5.0f  %4d-%4d %3d-%3d %6d | %4.0f %4.0f'%(t,a[0],a[1],a[2],a[2]+a[4],a[3],a[3]+a[5],a[6],b[0],b[1],b[2],b[2]+b[4],b[3],b[3]+b[5],b[6],a[0]-b[0],a[1]-b[1]))
