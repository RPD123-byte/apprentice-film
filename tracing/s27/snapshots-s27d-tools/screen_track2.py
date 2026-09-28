# page->frame homography of the screen, chained: the page is pre-warped by the previous frame's estimate and matched
# (SIFT, inside the warped screen quad) against the current frame; refined twice. Source 117.40 = page at identity.
import cv2, numpy as np, sys, json
from src import frame, times
t0,t1,step=float(sys.argv[1]),float(sys.argv[2]),float(sys.argv[3])
init=json.load(open(sys.argv[4]))  # [t,h..] rows; the row at t0 is the seed
outp=sys.argv[5]
page=frame(117.40,True).astype(np.uint8)
pm=np.full(page.shape,255,np.uint8); pm[:300,1850:]=0     # owl corner (the owl leaves the page)
seed=[r for r in init if abs(r[0]-t0)<1e-6][0]
Hc=np.array(seed[1:],float).reshape(3,3)
sift=cv2.SIFT_create(8000)
bf=cv2.BFMatcher(cv2.NORM_L2)
res=[]
tt=times(t0,t1,step) if t1>t0 else [round(t0-i*abs(step),3) for i in range(int(round((t0-t1)/abs(step)))+1)]
for t in tt:
    g=frame(t,True)
    for it in range(3):
        wp=cv2.warpPerspective(page,Hc,(2206,946),flags=cv2.INTER_AREA)
        wm=cv2.warpPerspective(pm,Hc,(2206,946),flags=cv2.INTER_NEAREST)
        wm=cv2.erode(wm,np.ones((9,9),np.uint8))
        # owl may be in front of the screen after 125.4: mask it out of the frame side via the same mask only
        k1,d1=sift.detectAndCompute(wp,wm)
        big=cv2.dilate(wm,np.ones((41,41),np.uint8))
        k2,d2=sift.detectAndCompute(g,big)
        if d1 is None or d2 is None or len(k1)<8 or len(k2)<8: break
        m=bf.knnMatch(d1,d2,k=2)
        good=[a for a,b in (x for x in m if len(x)==2) if a.distance<0.8*b.distance]
        A=np.float32([k1[x.queryIdx].pt for x in good]); B=np.float32([k2[x.trainIdx].pt for x in good])
        if len(good)<10: break
        D,inl=cv2.findHomography(A,B,cv2.RANSAC,2.5)
        if D is None: break
        Hc=D@Hc; Hc/=Hc[2,2]
        if np.abs(D-np.eye(3)).max()<1e-4: break
    c=cv2.perspectiveTransform(np.float32([[[0,0],[2206,0],[2206,946],[0,946]]]),Hc)[0]
    res.append([t]+[round(float(v),8) for v in Hc.flatten()])
    print(f"{t:.2f} n={len(good)} inl={int(inl.sum()) if inl is not None else 0} "+" ".join(f"({x:.1f},{y:.1f})" for x,y in c),flush=True)
json.dump(res,open(outp,'w'))
