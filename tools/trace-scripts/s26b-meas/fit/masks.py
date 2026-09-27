# masks.py kind F0 F1 : write source owl masks (1/2 res raw uint8, 1103x473) + eye landmarks to fit/m/<F>.bin
#   kind "bw": the white owl (bright, low-saturation blob) in C/D;  kind "col": |frame - warped clean page| in F
import cv2, numpy as np, sys, os, json
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s26b-tools')
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(V)
def grab(F): cap.set(1,F); ok,f=cap.read(); return f
os.makedirs('m',exist_ok=True)
def bwmask(f):
    hsv=cv2.cvtColor(cv2.GaussianBlur(f,(0,0),1.5),cv2.COLOR_BGR2HSV)
    m=((hsv[...,2]>165)&(hsv[...,1]<42)).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((7,7),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(m)
    best=None
    for i in range(1,n):
        if st[i][4]<5000: continue
        if not (650<cen[i][0]<1700 and 200<cen[i][1]<800): continue
        if best is None or st[i][4]>st[best][4]: best=i
    k=(lab==best).astype(np.uint8)*255
    # the black headphones / eyes / ink are dark: close the holes (and the headphone cups: bridge dark blobs touching)
    k=cv2.morphologyEx(k,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(17,17)))
    cs,_=cv2.findContours(k,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    out=np.zeros_like(k); cv2.drawContours(out,[max(cs,key=cv2.contourArea)],-1,255,-1)
    return out>0
kind=sys.argv[1]; F0,F1=int(sys.argv[2]),int(sys.argv[3])
if kind=='col':
    from srcmask import mask as colmask
for F in range(F0,F1+1):
    f=grab(F)
    if kind=='bw': m=bwmask(f)
    else:
        m,_=colmask(F)
    small=cv2.resize(m.astype(np.uint8)*255,(1103,473),interpolation=cv2.INTER_AREA)
    small.tofile(f'm/{F}.bin')
    ys,xs=np.nonzero(m); print(F,'area',m.sum(),'bbox',xs.min(),ys.min(),xs.max(),ys.max())
