# cowl.py dir clean_time t1 t2 ... : colour-owl silhouette = |frame - clean page| (render vs source), for t >= 114.9
import cv2, numpy as np, sys
d=sys.argv[1]; ct=sys.argv[2]
import glob
def find(prefix,t):
    fs=glob.glob(f"{d}/{prefix}-*-at-{t}s.png"); return fs[0] if fs else None
cr=cv2.imread(find('frame',ct)).astype(np.float32); cs=cv2.imread(find('ref',ct)).astype(np.float32)
def m(a,c):
    dd=np.abs(cv2.GaussianBlur(a,(0,0),3)-cv2.GaussianBlur(c,(0,0),3)).sum(2)
    k=(dd>60).astype(np.uint8)
    k[0:300,1880:2206]=0 if False else k[0:300,1880:2206]
    k=cv2.morphologyEx(k,cv2.MORPH_OPEN,np.ones((7,7),np.uint8)); k=cv2.morphologyEx(k,cv2.MORPH_CLOSE,np.ones((21,21),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(k)
    if n<2: return None
    i=1+np.argmax(st[1:,4]); return lab==i, st[i], cen[i]
out=[]
for t in sys.argv[3:]:
    a=cv2.imread(find('frame',t)).astype(np.float32); b=cv2.imread(find('ref',t)).astype(np.float32)
    A=m(a,cr); B=m(b,cs)
    iou=(A[0]&B[0]).sum()/max(1,(A[0]|B[0]).sum())
    fa=lambda S:(S[1][0],S[1][1],S[1][0]+S[1][2],S[1][1]+S[1][3])
    print(f"{t:>7} IoU={iou:.2f} render bbox={fa(A)} cen=({A[2][0]:.0f},{A[2][1]:.0f}) | source bbox={fa(B)} cen=({B[2][0]:.0f},{B[2][1]:.0f})")
    vis=np.zeros(A[0].shape+(3,),np.uint8); vis[A[0],2]=255; vis[B[0],1]=255
    out.append(cv2.resize(vis,(735,315)))
cv2.imwrite(d+'/cowl.jpg',np.vstack(out))
