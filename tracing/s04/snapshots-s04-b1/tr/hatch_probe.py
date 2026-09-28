# probe: oriented line energy on a source frame, to see the hatch structure (debug images only)
import cv2, numpy as np, sys
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s04-b1/tr')
from grade import degrade
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
t=float(sys.argv[1]); out=sys.argv[2]
cap=cv2.VideoCapture(V); cap.set(cv2.CAP_PROP_POS_FRAMES,round(t*25)); ok,f=cap.read()
F=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
P=degrade(F,t)
G=cv2.morphologyEx(P,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
G=cv2.GaussianBlur(G,(0,0),2)
R=np.clip(G-P,0,255)
# oriented second-derivative line detector (dark lines): 12 angles
sig=1.1; k=int(4*sig)
ang=np.arange(12)*np.pi/12
Pb=cv2.GaussianBlur(P,(0,0),sig)
Pxx=cv2.Sobel(Pb,cv2.CV_32F,2,0,ksize=3); Pyy=cv2.Sobel(Pb,cv2.CV_32F,0,2,ksize=3); Pxy=cv2.Sobel(Pb,cv2.CV_32F,1,1,ksize=3)
E=[]
for a in ang:
    # line along direction a: second derivative across it (normal n=(-sin a, cos a))
    nx,ny=-np.sin(a),np.cos(a)
    d2=Pxx*nx*nx+2*Pxy*nx*ny+Pyy*ny*ny
    E.append(cv2.GaussianBlur(np.clip(d2,0,None),(0,0),6))
E=np.array(E)
i1=E.argmax(0); e1=E.max(0); tot=E.sum(0)
th=ang[i1]
vis=np.zeros((P.shape[0],P.shape[1],3),np.uint8)
hue=(th/np.pi*180).astype(np.uint8)
val=np.clip(e1/np.percentile(e1,99)*255,0,255).astype(np.uint8)
sat=np.clip((e1/(tot/12+1e-3)-1)*120,0,255).astype(np.uint8)
vis=cv2.cvtColor(np.dstack([hue,sat,val]),cv2.COLOR_HSV2BGR)
cv2.imwrite(out,np.vstack([cv2.cvtColor(P.astype(np.uint8),cv2.COLOR_GRAY2BGR),vis]))
cv2.imwrite(out.replace('.jpg','-R.jpg'),np.clip(R*3,0,255).astype(np.uint8))
print('P mean',P.mean(),'R mean',R.mean())
