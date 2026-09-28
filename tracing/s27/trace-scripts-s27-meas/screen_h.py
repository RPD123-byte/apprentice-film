# page->frame homography of the laptop screen content, by SIFT matching each frame against the full-frame page (117.0 s)
import cv2, numpy as np, sys, json
from common import *
ref=load(117.0,True)
sift=cv2.SIFT_create(8000)
S=0.4
refs=cv2.resize(ref,None,fx=S,fy=S,interpolation=cv2.INTER_AREA)
kr,dr=sift.detectAndCompute(refs,None)
bf=cv2.BFMatcher(cv2.NORM_L2)
out={}
t0,t1=float(sys.argv[1]),float(sys.argv[2])
for t in times(t0,t1,0.04):
    g=load(t,True)
    k,d=sift.detectAndCompute(g,None)
    if d is None: continue
    ms=bf.knnMatch(dr,d,k=2)
    good=[m for m,n in ms if m.distance<0.75*n.distance]
    if len(good)<12: print(t,'few',len(good)); continue
    A=np.float32([kr[m.queryIdx].pt for m in good])/S; B=np.float32([k[m.trainIdx].pt for m in good])
    H,inl=cv2.findHomography(A,B,cv2.RANSAC,3.0)
    if H is None: print(t,'nofit'); continue
    H=H/H[2,2]
    corners=cv2.perspectiveTransform(np.float32([[[0,0]],[[2206,0]],[[2206,946]],[[0,946]]]),H).reshape(-1,2)
    out[t]={'H':H.tolist(),'inl':int(inl.sum()),'n':len(good),'corners':corners.round(1).tolist()}
    print(f"{t:.2f} inl={int(inl.sum()):4d}/{len(good):4d} corners="+" ".join(f"({x:.0f},{y:.0f})" for x,y in corners))
json.dump(out,open(f'screenH_{t0}_{t1}.json','w'))
