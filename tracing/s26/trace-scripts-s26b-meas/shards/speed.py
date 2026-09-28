# speed.py F0 F1 : per-frame speed lines (bright thin radial strokes not in the shard outline network / owl / scissors)
import cv2, numpy as np, json, sys
from skimage.morphology import skeletonize
from skimage.transform import probabilistic_hough_line
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(V)
F0,F1=int(sys.argv[1]),int(sys.argv[2])
segs=json.load(open('segsC.json')); cam=json.load(open('camAffC.json'))
CX,CY=1075,430
out={}
for F in range(F0,F1+1):
    cap.set(1,F); ok,f=cap.read(); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
    hsv=cv2.cvtColor(f,cv2.COLOR_BGR2HSV)
    th=cv2.morphologyEx(g,cv2.MORPH_TOPHAT,np.ones((15,15),np.uint8))
    m=((th>50)&(g>165)&(hsv[...,1]<70)).astype(np.uint8)
    # remove the shard outlines (field mapped to this frame)
    M=np.array(cam[str(F)]).reshape(2,3) if str(F) in cam else np.float32([[1,0,0],[0,1,0]])
    O=np.zeros_like(m)
    for s in segs:
        p=M@[s[0],s[1],1]; q=M@[s[2],s[3],1]; cv2.line(O,(int(p[0]),int(p[1])),(int(q[0]),int(q[1])),1,7)
    m[O>0]=0
    try:
        om=np.fromfile(f'../fit/m/{F}.bin',np.uint8).reshape(473,1103); om=cv2.resize(om,(2206,946))>127
        om=cv2.dilate(om.astype(np.uint8),np.ones((15,15),np.uint8))>0; m[om]=0
    except Exception: pass
    sk=skeletonize(m>0)
    lines=probabilistic_hough_line(sk,threshold=10,line_length=40,line_gap=6,rng=1)
    dt=cv2.distanceTransform(cv2.dilate(m,np.ones((2,2),np.uint8)),cv2.DIST_L2,3)
    res=[]
    for (x0,y0),(x1,y1) in lines:
        # radial test: direction vs the ray from the burst centre through the segment's midpoint
        mx,my=(x0+x1)/2,(y0+y1)/2; d=np.array([x1-x0,y1-y0],float); d/=np.linalg.norm(d)
        r=np.array([mx-CX,my-CY],float); rl=np.linalg.norm(r)
        if rl<150: continue
        r/=rl
        if abs(d@r)<0.95: continue
        # orient outward
        if (np.array([x1,y1])-[CX,CY])@r < (np.array([x0,y0])-[CX,CY])@r: x0,y0,x1,y1=x1,y1,x0,y0
        n=int(np.hypot(x1-x0,y1-y0)); u=np.linspace(0,1,max(2,n//4))
        ws=[2*dt[int(y0+(y1-y0)*k),int(x0+(x1-x0)*k)] for k in u]
        res.append([int(x0),int(y0),int(x1),int(y1),round(float(np.median(ws[:len(ws)//3+1])),1),round(float(np.median(ws[-(len(ws)//3+1):])),1)])
    out[F]=res
    print(F,len(res))
json.dump(out,open('speed.json','w'))
