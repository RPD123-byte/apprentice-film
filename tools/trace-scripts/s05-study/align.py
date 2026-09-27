# align.py DIR IDX : per-region similarity render->source (how far the render is from the source), SIFT
import cv2, numpy as np, sys, glob
d,idx=sys.argv[1],sys.argv[2]
fr=cv2.cvtColor(cv2.imread(glob.glob(f'{d}/frame-{idx}-*.png')[0]),cv2.COLOR_BGR2GRAY)
rf=cv2.cvtColor(cv2.imread(glob.glob(f'{d}/ref-{idx}-*.png')[0]),cv2.COLOR_BGR2GRAY)
REG={'room':[(0,0,300,330),(0,330,250,800),(240,90,690,215),(690,0,1100,160),(930,160,1100,480),(1128,190,1290,500)],
     'lapedge':[(250,130,950,700)],'deck':[(420,540,1250,900)],'head':[(1250,0,1920,560)],'owl':[(1450,230,1760,700)],'back':[(1500,600,2206,946)]}
sift=cv2.SIFT_create(8000)
ka,da=sift.detectAndCompute(cv2.GaussianBlur(fr,(0,0),1.5),None); kb,db=sift.detectAndCompute(cv2.GaussianBlur(rf,(0,0),1.5),None)
ms=cv2.BFMatcher().knnMatch(da,db,k=2); good=[m for m,n in ms if m.distance<0.8*n.distance]
A=np.float32([ka[m.queryIdx].pt for m in good]); B=np.float32([kb[m.trainIdx].pt for m in good])
for k,rs in REG.items():
    sel=np.zeros(len(A),bool)
    for (x0,y0,x1,y1) in rs: sel|=(A[:,0]>=x0)&(A[:,0]<x1)&(A[:,1]>=y0)&(A[:,1]<y1)
    if sel.sum()<6: print(k,'--',sel.sum()); continue
    M,inl=cv2.estimateAffinePartial2D(A[sel],B[sel],ransacReprojThreshold=6,maxIters=5000)
    if M is None: print(k,'no fit'); continue
    s=np.hypot(M[0,0],M[1,0]); r=np.degrees(np.arctan2(M[1,0],M[0,0]))
    cx=np.mean([(a+c)/2 for a,b,c,e in rs]); cy=np.mean([(b+e)/2 for a,b,c,e in rs])
    p=M@np.array([cx,cy,1])
    print(f"{k:8s} s{s:.4f} r{r:+.2f} d@centre({p[0]-cx:+.1f},{p[1]-cy:+.1f}) inl {int(inl.sum())}/{sel.sum()}")
