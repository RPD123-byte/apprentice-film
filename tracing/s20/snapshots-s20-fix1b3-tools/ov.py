#!/usr/bin/env python3
# ov.py renderdir out.jpg x0 y0 x1 y1 scale t1 t2 ... : for each t: [render | source | overlay(render gray, source edges green)]
import cv2, sys, numpy as np
D='/Users/computer/rootline/apprentice-film/snapshots/s20-fix1b3-src'
rd,out=sys.argv[1],sys.argv[2]; x0,y0,x1,y1=map(int,sys.argv[3:7]); sc=float(sys.argv[7]); ts=sys.argv[8:]
rows=[]
def grid(im):
    for x in range((x0//50+1)*50,x1,50): cv2.line(im,(x-x0,0),(x-x0,y1-y0),(0,90,200) if x%100 else (0,160,255),1)
    for y in range((y0//50+1)*50,y1,50): cv2.line(im,(0,y-y0),(x1-x0,y-y0),(0,90,200) if y%100 else (0,160,255),1)
    return im
for t in ts:
    fr=int(round(float(t)*25))
    r=cv2.imread(f'{rd}/r_{float(t):.2f}.png'); s=cv2.imread(f'{D}/f_{fr}.png')
    r=r[y0:y1,x0:x1]; s=s[y0:y1,x0:x1]
    e=cv2.Canny(cv2.GaussianBlur(cv2.cvtColor(s,cv2.COLOR_BGR2GRAY),(0,0),1.5),40,100)
    o=cv2.cvtColor(cv2.cvtColor(r,cv2.COLOR_BGR2GRAY),cv2.COLOR_GRAY2BGR)//2+40
    o[e>0]=(0,255,0)
    ims=[grid(r.copy()),grid(s.copy()),grid(o)]
    ims=[cv2.resize(i,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC) for i in ims]
    for i,lab in zip(ims,['render '+t,'src '+str(fr),'ov']):
        cv2.putText(i,lab,(4,16),0,0.5,(0,255,255),1)
        for x in range((x0//100+1)*100,x1,100): cv2.putText(i,str(x),(int((x-x0)*sc)+2,30),0,0.35,(0,200,255),1)
        for y in range((y0//100+1)*100,y1,100): cv2.putText(i,str(y),(2,int((y-y0)*sc)-2),0,0.35,(0,200,255),1)
    rows.append(np.hstack(ims))
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88])
