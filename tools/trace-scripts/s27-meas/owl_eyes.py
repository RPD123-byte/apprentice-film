import cv2, numpy as np, json, sys
from common import *
out={}
prev=None
for t in [round(127.4-0.04*i,2) for i in range(0,31)]:
    f=load(t); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
    x0,y0,x1,y1=1150,200,1800,760
    roi=cv2.GaussianBlur(g[y0:y1,x0:x1],(3,3),0)
    # eyes: dark discs (pupil+iris) surrounded by light face
    cands=[]
    for r in range(5,24,1):
        k=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*r+1,2*r+1))
        dark=cv2.erode(255-roi,k)  # min over disc of darkness: high where a whole disc is dark
        # ring lightness
        ring=cv2.dilate(roi,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*r+9,2*r+9)))
        score=dark.astype(float)-0.0
        yx=np.unravel_index(np.argsort(score,axis=None)[-40:],score.shape)
        for yy,xx in zip(*yx): cands.append((score[yy,xx],xx+x0,yy+y0,r))
    cands.sort(reverse=True)
    print(t,[ (int(c[1]),int(c[2]),c[3],int(c[0])) for c in cands[:6]])
