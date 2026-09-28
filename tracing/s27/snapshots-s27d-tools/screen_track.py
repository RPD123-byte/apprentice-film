# page->frame homography of the laptop screen content, SIFT vs the full colour page (source 117.40 = page at identity)
import cv2, numpy as np, sys, json
from src import frame, times
t0,t1=float(sys.argv[1]),float(sys.argv[2]); step=float(sys.argv[3]) if len(sys.argv)>3 else 0.04
page=frame(117.40,True)
# drop the owl corner (it leaves the page later) and the nav
mask=np.full(page.shape,255,np.uint8); mask[:300,1850:]=0
sift=cv2.SIFT_create(6000)
kp,dp=sift.detectAndCompute(page,mask)
fl=cv2.FlannBasedMatcher(dict(algorithm=1,trees=5),dict(checks=64))
out=[]; Hprev=None
for t in times(t0,t1,step):
    g=frame(t,True)
    k,d=sift.detectAndCompute(g,None)
    if d is None: print(t,'none'); continue
    m=fl.knnMatch(dp,d,k=2)
    good=[a for a,b in m if a.distance<0.75*b.distance]
    if len(good)<12: print(t,'few',len(good)); continue
    A=np.float32([kp[x.queryIdx].pt for x in good]); B=np.float32([k[x.trainIdx].pt for x in good])
    Hm,inl=cv2.findHomography(A,B,cv2.RANSAC,3.0)
    if Hm is None: print(t,'nofit'); continue
    Hm=Hm/Hm[2,2]
    c=cv2.perspectiveTransform(np.float32([[[0,0],[2206,0],[2206,946],[0,946]]]),Hm)[0]
    out.append([t]+[round(float(v),7) for v in Hm.flatten()])
    print(f"{t:.2f} inl={int(inl.sum()):4d}/{len(good):4d} corners "+" ".join(f"({x:.1f},{y:.1f})" for x,y in c),flush=True)
json.dump(out,open(sys.argv[4] if len(sys.argv)>4 else f'screen_{t0}_{t1}.json','w'))
