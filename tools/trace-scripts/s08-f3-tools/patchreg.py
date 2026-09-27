import sys, numpy as np, cv2
S='/Users/computer/rootline/apprentice-film/snapshots/s08-f3-src/'
R=sys.argv[1]; frames=[int(x) for x in sys.argv[2].split(',')]
P=96; win=cv2.createHanningWindow((P,P),cv2.CV_32F)
allm=[]
for k in frames:
    a=cv2.GaussianBlur(cv2.imread(f'{R}/r{k}.png').astype(np.float32).mean(-1),(0,0),1.0)
    b=cv2.GaussianBlur(cv2.imread(S+f'f{k}.png').astype(np.float32).mean(-1),(0,0),1.0)
    pts=[];sh=[]
    for y in range(20,946-P,70):
        for x in range(0,2206-P,90):
            pa=a[y:y+P,x:x+P]; pb=b[y:y+P,x:x+P]
            if pb.std()<15: continue
            (dx,dy),resp=cv2.phaseCorrelate(pb,pa,win)
            if resp<0.25 or abs(dx)>6 or abs(dy)>6: continue
            pts.append((x+P/2,y+P/2)); sh.append((dx,dy))
    pts=np.array(pts); sh=np.array(sh)
    # robust affine fit of shifts vs position
    X=np.c_[pts,np.ones(len(pts))]
    cx=np.linalg.lstsq(X,sh[:,0],rcond=None)[0]; cy=np.linalg.lstsq(X,sh[:,1],rcond=None)[0]
    res=sh-np.c_[X@cx,X@cy]
    med=np.median(sh,0); mad=np.median(np.abs(sh-med),0)
    allm.append(np.abs(med))
    print(k,'n %3d median shift %+.2f %+.2f  mad %.2f %.2f  | trend dx: %+.4f*x %+.4f*y  dy: %+.4f*x %+.4f*y'%(len(sh),med[0],med[1],mad[0],mad[1],cx[0]*1000,cx[1]*1000,cy[0]*1000,cy[1]*1000))
print('mean |median|',np.mean(allm,0).round(3))
