# gstrip.py T0 T1 STEP out.jpg x0 y0 x1 y1 [--cols N] [--w PX] [--grid 100]: source crops with a labelled frame-px grid
import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
a=[];o={};i=1
while i<len(sys.argv):
    s=sys.argv[i]
    if s.startswith('--'): o[s]=sys.argv[i+1]; i+=2
    else: a.append(s); i+=1
t0,t1,st,out=float(a[0]),float(a[1]),float(a[2]),a[3]; x0,y0,x1,y1=[int(v) for v in a[4:8]]
cols=int(o.get('--cols',4)); tw=int(o.get('--w',500)); gs=int(o.get('--grid',100))
c=cv2.VideoCapture(V); tiles=[]; t=t0
while t<=t1+1e-6:
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read()
    if not ok: break
    f=f.copy()
    for x in range((x0//gs)*gs,x1+1,gs):
        cv2.line(f,(x,y0),(x,y1),(0,200,255),1)
    for y in range((y0//gs)*gs,y1+1,gs):
        cv2.line(f,(x0,y),(x1,y),(0,200,255),1)
    f=f[y0:y1,x0:x1]; sc=tw/f.shape[1]; f=cv2.resize(f,(tw,int(f.shape[0]*sc)),interpolation=cv2.INTER_AREA)
    for x in range((x0//gs)*gs,x1+1,gs):
        if x>=x0: cv2.putText(f,str(x),(int((x-x0)*sc)+2,12),0,0.35,(0,255,255),1)
    for y in range((y0//gs)*gs,y1+1,gs):
        if y>=y0: cv2.putText(f,str(y),(2,int((y-y0)*sc)-2),0,0.35,(0,255,255),1)
    cv2.putText(f,f"{t:.2f}",(tw-60,f.shape[0]-6),0,0.5,(0,255,0),1)
    tiles.append(f); t+=st
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]),[cv2.IMWRITE_JPEG_QUALITY,88]); print(out,len(tiles))
