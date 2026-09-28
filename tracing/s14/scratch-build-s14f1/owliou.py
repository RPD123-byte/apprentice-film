import cv2, sys, glob, numpy as np
d=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); thr=int(sys.argv[6]) if len(sys.argv)>6 else 110
for f in sorted(glob.glob(d+'/frame-*.png')):
    t=f.split('-at-')[1][:-5]
    a=cv2.imread(f,0)[y0:y1,x0:x1]; b=cv2.imread(f.replace('frame-','ref-'),0)[y0:y1,x0:x1]
    A=a>thr; B=b>thr
    if B.sum()<50: continue
    iou=(A&B).sum()/max(1,(A|B).sum())
    def bb(M):
        ys,xs=np.nonzero(M); return (xs.min()+x0,ys.min()+y0,xs.max()+x0,ys.max()+y0) if len(xs) else None
    # ring outside the source silhouette 0-4 px
    k=np.ones((9,9),np.uint8); ring=(cv2.dilate(B.astype(np.uint8),k)>0)&~B
    print(t,'IoU',round(iou,3),'bbox r',bb(A),'s',bb(B),'mean in src mask r/s',round(a[B].mean()),round(b[B].mean()),'ring r/s',round(a[ring].mean()),round(b[ring].mean()))
