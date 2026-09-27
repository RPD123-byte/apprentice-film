# loops.py F0 F1 : find the scissors' finger loops (bright rings round dark holes) per frame, both sides
import cv2, numpy as np, json, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(V)
F0,F1=int(sys.argv[1]),int(sys.argv[2]); out={}
for F in range(F0,F1+1):
    cap.set(1,F); ok,f=cap.read()
    hsv=cv2.cvtColor(cv2.GaussianBlur(f,(0,0),1.2),cv2.COLOR_BGR2HSV)
    m=((hsv[...,2]>140)&(hsv[...,1]<60)).astype(np.uint8)
    cs,hier=cv2.findContours(m,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
    res={'L':[],'R':[]}
    if hier is not None:
        for i,c in enumerate(cs):
            if hier[0][i][3]<0: continue          # holes only
            a=cv2.contourArea(c)
            if not (500<a<9000) or len(c)<20: continue
            (ex,ey),(w,h),ang=cv2.fitEllipse(c)
            fill=a/(np.pi*w*h/4)
            if fill<0.8 or max(w,h)/max(1,min(w,h))>2.6: continue
            # ring thickness: the parent must surround it tightly -> check bright pixels on a ring 6 px outside
            side='L' if ex<1103 else 'R'
            if 700<ex<1600 and ey>250: continue   # the owl
            res[side].append([round(ex,1),round(ey,1),round(w,1),round(h,1),round(ang,1),int(a)])
    out[F]=res
    print(F,{k:[(v[0],v[1],v[5]) for v in vv] for k,vv in res.items()})
json.dump(out,open('loopsD.json','w'))
