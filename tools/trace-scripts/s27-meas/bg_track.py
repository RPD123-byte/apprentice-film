# Background (wall/shelves/window) homography chained frame to frame: SIFT matches inside a mask that excludes the
# laptop lid (from the screen H), the designer (x < xd(t)) and the desk (y > ydesk).
import cv2, numpy as np, json, sys
from common import *
Hs={float(t):np.array(v['H']) for t,v in json.load(open('screenT_118.0_129.3.json')).items()}
XD=[(119.6,-100),(120.8,0),(121.2,120),(121.6,260),(122.0,460),(122.4,620),(122.8,760),(123.2,860),(123.6,960),(124.0,1040),(124.4,1080),(125.0,1100),(127.6,1100),(128.4,1150)]
def xd(t):
    for (a,va),(b,vb) in zip(XD,XD[1:]):
        if a<=t<=b: return va+(vb-va)*(t-a)/(b-a)
    return XD[-1][1] if t>XD[-1][0] else XD[0][1]
def mask(t, ymax):
    m=np.zeros((946,2206),np.uint8); m[:ymax,:]=255
    x=int(xd(t))+60
    if x>0: m[:,:x]=0
    if t in Hs:
        q=cv2.perspectiveTransform(np.float32([[[-150,-300]],[[2330,-300]],[[2330,1300]],[[-150,1300]]]),Hs[t]).reshape(-1,2)
        cv2.fillPoly(m,[q.astype(np.int32)],0)
    if t>=126.0: m[330:,1150:1650]=0
    return m
sift=cv2.SIFT_create(4000); bf=cv2.BFMatcher(cv2.NORM_L2)
t0,t1=float(sys.argv[1]),float(sys.argv[2]); ymax=int(sys.argv[3]); outfn=sys.argv[4]
ts=times(t0,t1,0.04)
H=np.array(json.load(open(sys.argv[5]))[sys.argv[6]]) if len(sys.argv)>6 else np.eye(3); out={str(ts[0]):H.tolist()}
g0=load(ts[0],True); k0,d0=sift.detectAndCompute(g0,mask(ts[0],ymax))
for t in ts[1:]:
    g=load(t,True); k,d=sift.detectAndCompute(g,mask(t,ymax))
    ms=bf.knnMatch(d0,d,k=2); good=[a for a,b in ms if a.distance<0.75*b.distance]
    A=np.float32([k0[a.queryIdx].pt for a in good]); B=np.float32([k[a.trainIdx].pt for a in good])
    D,inl=cv2.findHomography(A,B,cv2.RANSAC,2.0)
    H=D@H; H/=H[2,2]; out[str(t)]=H.tolist()
    c=cv2.perspectiveTransform(np.float32([[[300,200]],[[1900,200]],[[1900,600]],[[300,600]]]),H).reshape(-1,2)
    if round(t*25)%5==0: print(f"{t:.2f} inl={int(inl.sum())}/{len(good)} "+" ".join(f"({x:.0f},{y:.0f})" for x,y in c),flush=True)
    k0,d0=k,d
json.dump(out,open(outfn,'w'))
