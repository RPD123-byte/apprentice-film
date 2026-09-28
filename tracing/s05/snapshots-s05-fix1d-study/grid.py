#!/usr/bin/env python3
# grid.py IMG out.jpg x0 y0 x1 y1 [scale] [step] [--poly file.json names...]: crop with labelled frame-px grid
import cv2, sys, json
a=sys.argv; img=cv2.imread(a[1]); out=a[2]; x0,y0,x1,y1=[int(v) for v in a[3:7]]
sc=float(a[7]) if len(a)>7 and not a[7].startswith('--') else 1.0
st=int(a[8]) if len(a)>8 and not a[8].startswith('--') else 50
c=img[y0:y1,x0:x1].copy()
c=cv2.resize(c,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC if sc>1 else cv2.INTER_AREA)
P=lambda x,y:(int(round((x-x0)*sc)),int(round((y-y0)*sc)))
if '--poly' in a:
    i=a.index('--poly'); d=json.load(open(a[i+1])); names=a[i+2:] or list(d.keys())
    cols=[(0,0,255),(0,255,0),(255,0,0),(0,255,255),(255,0,255),(255,255,0)]
    for j,n in enumerate(names):
        pts=d[n]; col=cols[j%len(cols)]
        for k in range(len(pts)-1): cv2.line(c,P(*pts[k]),P(*pts[k+1]),col,1,cv2.LINE_AA)
for x in range((x0//st)*st,x1+1,st):
    if x<x0: continue
    col=(0,0,255) if x%100==0 else (0,160,220)
    cv2.line(c,P(x,y0),P(x,y1),col,1); cv2.putText(c,str(x),(P(x,y0)[0]+2,12),0,0.38,(0,255,255),1)
for y in range((y0//st)*st,y1+1,st):
    if y<y0: continue
    col=(0,0,255) if y%100==0 else (0,160,220)
    cv2.line(c,P(x0,y),P(x1,y),col,1); cv2.putText(c,str(y),(2,P(x0,y)[1]-2),0,0.38,(0,255,255),1)
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,90])
