# polyov.py fills.json src.png out.jpg layer x0 y0 x1 y1 [scale] : fill polygons (with index labels) over the source
import json, sys, cv2, numpy as np
F=json.load(open(sys.argv[1])); im=cv2.imread(sys.argv[2]); out=sys.argv[3]; layer=sys.argv[4]
x0,y0,x1,y1=[int(v) for v in sys.argv[5:9]]; sc=float(sys.argv[9]) if len(sys.argv)>9 else 1.5
g=cv2.cvtColor(cv2.cvtColor(im,cv2.COLOR_BGR2GRAY),cv2.COLOR_GRAY2BGR)
g=cv2.convertScaleAbs(g,alpha=1.6,beta=10)
g=cv2.resize(g[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
cols=[(0,0,255),(0,255,0),(255,0,0),(0,255,255),(255,0,255),(255,255,0),(0,128,255),(255,128,0)]
for f in F['fills']:
    if f['layer']!=layer: continue
    c=cols[f['idx']%len(cols)]
    for s in f['subs']:
        P=((np.array(s)-[x0,y0])*sc).astype(np.int32)
        cv2.polylines(g,[P],True,c,1)
    if f['subs']:
        P=np.array(f['subs'][0]); cx,cy=P.mean(0)
        if x0<=cx<x1 and y0<=cy<y1: cv2.putText(g,str(f['idx']),(int((cx-x0)*sc),int((cy-y0)*sc)),0,0.4,c,1)
for x in range((x0//100+1)*100,x1,100): cv2.putText(g,str(x),(int((x-x0)*sc)+2,12),0,0.4,(255,255,255),1); cv2.line(g,(int((x-x0)*sc),0),(int((x-x0)*sc),8),(255,255,255),1)
for y in range((y0//100+1)*100,y1,100): cv2.putText(g,str(y),(2,int((y-y0)*sc)-2),0,0.4,(255,255,255),1); cv2.line(g,(0,int((y-y0)*sc)),(8,int((y-y0)*sc)),(255,255,255),1)
cv2.imwrite(out,g,[cv2.IMWRITE_JPEG_QUALITY,90])
