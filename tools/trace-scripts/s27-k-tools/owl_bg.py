# owl_bg.py T... : the SOURCE owl's silhouette by background subtraction while the camera holds (124.8-127.6: measured
# static to 0.3 px). Background = median of the frames where the owl is elsewhere (126.36-127.6 in general; 124.8-126.2
# where it later sits). Owl = blurred colour difference > threshold, holes filled, the component under our owl.
import cv2, numpy as np, sys, os
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s27-meas')
from common import load
D='/Users/computer/rootline/apprentice-film/snapshots/s27-k-owl/'
E=lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*r+1,2*r+1))
if not os.path.exists(D+'bg1.png'):
    M1=np.median(np.stack([load(round(126.36+0.04*k,2)) for k in range(32)]),0).astype(np.uint8)
    M2=np.median(np.stack([load(round(124.8+0.04*k,2)) for k in range(36)]),0).astype(np.uint8)
    cv2.imwrite(D+'bg1.png',M1); cv2.imwrite(D+'bg2.png',M2)
M1=cv2.imread(D+'bg1.png'); M2=cv2.imread(D+'bg2.png')
S=np.zeros(M1.shape[:2],np.uint8)
for f in ['good-127.08.png','good-127.32.png']: S|=(cv2.imread(D+f)[...,0]>128).astype(np.uint8)
S=cv2.dilate(S,E(30))
BG=np.where(S[...,None]>0,M2,M1).astype(np.float32)
thr=float(os.environ.get('THR','30'))
for a in sys.argv[1:]:
    t=float(a); f0=load(t); O=(cv2.imread(f'{D}l-{t:.2f}.png').max(2)>60).astype(np.uint8)
    d=np.abs(cv2.GaussianBlur(f0.astype(np.float32),(0,0),1.5)-cv2.GaussianBlur(BG,(0,0),1.5)).max(2)
    m=(d>thr).astype(np.uint8)&(cv2.dilate(O,E(90))>0)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,E(3)); m=cv2.morphologyEx(m,cv2.MORPH_OPEN,E(2))
    n,cc,st,_=cv2.connectedComponentsWithStats(m)
    if n<=1: continue
    ov_=[((cc==k)&(O>0)).sum() for k in range(1,n)]; k=1+int(np.argmax(ov_))
    m=(cc==k).astype(np.uint8)
    cnts,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); m2=np.zeros_like(m); cv2.drawContours(m2,cnts,-1,1,-1)
    o=np.zeros(f0.shape,np.uint8); o[m2>0]=(255,0,255); cv2.imwrite(f'{D}om-{t:.2f}.png',o)
    print(t,'area',int(m2.sum()))
