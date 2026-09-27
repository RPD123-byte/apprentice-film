# iou2.py RAWDIR NOOWLDIR T... : owl lit-silhouette IoU with the SAME criterion on both sides (fix pass 1):
# lit (>110 after a 1.5 px blur) and >35 from the owl-free background (source: plate2; ours: our own no-owl render)
import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
bg=cv2.GaussianBlur(cv2.cvtColor(cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s17-lab/plate2.png'),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.5)
cap=cv2.VideoCapture(V)
X0,Y0,X1,Y1=300,250,1000,640
def clean(m):
    m=m.astype(np.uint8); m[:,:X0]=0; m[:,X1:]=0; m[:Y0]=0; m[Y1:]=0; m[280:470,800:880]=0
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(m); keep=[i for i in range(1,n) if st[i,4]>150]
    return np.isin(lab,keep)
def srcmask(t):
    cap.set(1,round(t*25)); ok,f=cap.read(); g=cv2.GaussianBlur(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.5)
    return clean((np.abs(g-bg)>35)&(g>110))
def ourmask(d,dn,t):
    a=cv2.GaussianBlur(cv2.imread(f'{d}/r-{t:.2f}.png',0).astype(np.float32),(0,0),1.5); b=cv2.GaussianBlur(cv2.imread(f'{dn}/r-{t:.2f}.png',0).astype(np.float32),(0,0),1.5)
    return clean((np.abs(a-b)>35)&(a>110))
d,dn=sys.argv[1],sys.argv[2]; out=[]
for t in map(float,sys.argv[3:]):
    S=srcmask(t); O=ourmask(d,dn,t); iou=(S&O).sum()/max(1,(S|O).sum()); out.append(iou)
    print(f'{t:.2f} IoU {iou:.3f}  src {S.sum()} ours {O.sum()}')
