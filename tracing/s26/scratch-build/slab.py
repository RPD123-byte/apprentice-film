import cv2, glob, re, sys, numpy as np
def mask(im):
    b=cv2.GaussianBlur(im,(0,0),6)
    hsv=cv2.cvtColor(b,cv2.COLOR_BGR2HSV)
    g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32)
    lap=cv2.GaussianBlur(np.abs(cv2.Laplacian(g,cv2.CV_32F,ksize=3)),(0,0),6)
    m=((hsv[...,1]<40)&(hsv[...,2]>28)&(hsv[...,2]<170)&(lap<9)).astype(np.uint8)*255
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(25,25)))
    n,l,st,cen=cv2.connectedComponentsWithStats(m)
    if n<2: return None,None
    i=1+np.argmax(st[1:,4]); return st[i],(l==i)
out=sys.argv[1]
for d,t in [(a.split(':')[0],a.split(':')[1]) for a in sys.argv[2:]]:
    f=glob.glob(f"{d}/frame-*-at-{t}s.png")[0]; r=f.replace('/frame-','/ref-')
    A=cv2.imread(f); B=cv2.imread(r)
    a,ma=mask(A); b,mb=mask(B)
    iou=(ma&mb).sum()/max(1,(ma|mb).sum()) if a is not None and b is not None else 0
    print(t,'render',None if a is None else (a[0],a[1],a[0]+a[2],a[1]+a[3],a[4]),'source',None if b is None else (b[0],b[1],b[0]+b[2],b[1]+b[3],b[4]),f"IoU {iou:.2f}")
    vis=np.zeros((946,2206,3),np.uint8)
    if ma is not None: vis[ma]=(0,0,255)
    if mb is not None: vis[mb]=vis[mb]+np.array([255,0,0],np.uint8)
    cv2.imwrite(f"{out}/slabmask-{t}.jpg",cv2.resize(vis,(1103,473)))
