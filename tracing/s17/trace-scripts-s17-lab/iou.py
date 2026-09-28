# iou.py RAWDIR NOOWLRAWDIR T... : owl silhouette IoU (ours vs source) and the best shift maximising it
import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
bg=cv2.GaussianBlur(cv2.cvtColor(cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s17-lab/plate2.png'),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.5)
cap=cv2.VideoCapture(V)
X0,Y0,X1,Y1=300,250,1000,640
def srcmask(t):
    cap.set(1,round(t*25)); ok,f=cap.read()
    g=cv2.GaussianBlur(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.5)
    m=((np.abs(g-bg)>35)&(g>110)).astype(np.uint8)
    m[:,:X0]=0; m[:,X1:]=0; m[:Y0]=0; m[Y1:]=0
    m[280:470,800:880]=0
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(m); keep=[i for i in range(1,n) if st[i,4]>150]
    return np.isin(lab,keep)
def ourmask(d,dn,t):
    a=cv2.imread(f'{d}/r-{t:.2f}.png',0).astype(np.float32); b=cv2.imread(f'{dn}/r-{t:.2f}.png',0).astype(np.float32)
    m=(np.abs(a-b)>10).astype(np.uint8); m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
    m[280:470,800:880]=0
    return m>0
d,dn=sys.argv[1],sys.argv[2]
for t in map(float,sys.argv[3:]):
    S=srcmask(t); O=ourmask(d,dn,t)
    iou=(S&O).sum()/max(1,(S|O).sum())
    best=(iou,0,0)
    for dy in range(-14,15,2):
        for dx in range(-14,15,2):
            Os=np.roll(np.roll(O,dy,0),dx,1); v=(S&Os).sum()/max(1,(S|Os).sum())
            if v>best[0]: best=(v,dx,dy)
    ys,xs=np.nonzero(S); yo,xo=np.nonzero(O)
    print(f'{t:.2f} IoU {iou:.3f} best {best[0]:.3f} at dx={best[1]} dy={best[2]}  src bbox {xs.min()}-{xs.max()},{ys.min()}-{ys.max()} ours {xo.min()}-{xo.max()},{yo.min()}-{yo.max()}')
