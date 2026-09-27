#!/usr/bin/env python3
# Zoomed source crop with a labelled grid (labels on every line, in frame px) and optional overlay of shapes
# from a JS data file (export const NAME = {...json...}; keys -> {pts:[[x,y]..], closed?:bool} or [[x,y]..]).
# Usage: gz.py T x0 y0 x1 y1 out.jpg [--z 3] [--step 25] [--data file.js --keys a,b] [--render frame.png]
import cv2,sys,json,re,numpy as np
sys.path.insert(0,'snapshots/s28-tools')
from grade import grab
a=sys.argv[1:]; opts={}; pos=[]
i=0
while i<len(a):
    if a[i].startswith('--'): opts[a[i][2:]]=a[i+1]; i+=2
    else: pos.append(a[i]); i+=1
t=float(pos[0]); x0,y0,x1,y1=[int(v) for v in pos[1:5]]; out=pos[5]
z=float(opts.get('z',3)); step=int(opts.get('step',25))
f=grab(t) if 'render' not in opts else cv2.imread(opts['render'])
if 'blend' in opts:
    r=cv2.imread(opts['blend']); al=float(opts.get('alpha',0.5)); f=cv2.addWeighted(f,1-al,r,al,0)
c=f[y0:y1,x0:x1]; c=cv2.resize(c,None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)
def P(x,y): return (int(round((x-x0)*z)),int(round((y-y0)*z)))
for x in range((x0//step+1)*step,x1,step):
    col=(0,0,255) if x%100==0 else (0,200,255)
    cv2.line(c,P(x,y0),P(x,y1),col,1)
    if x%50==0: cv2.putText(c,str(x),(P(x,y0)[0]+2,12),0,0.4,(0,255,255),1)
for y in range((y0//step+1)*step,y1,step):
    col=(0,0,255) if y%100==0 else (0,200,255)
    cv2.line(c,P(x0,y),P(x1,y),col,1)
    if y%50==0: cv2.putText(c,str(y),(2,P(x0,y)[1]-2),0,0.4,(0,255,255),1)
if 'data' in opts:
    s=open(opts['data']).read()
    keys=opts.get('keys','').split(',') if opts.get('keys') else None
    # find all "name": [[..]] arrays of points inside the data
    for m in re.finditer(r'"?([A-Za-z_0-9]+)"?\s*:\s*(\[\s*\[[-\d.,\s\[\]]*\]\s*\])',s):
        name=m.group(1)
        if keys and name not in keys: continue
        try: pts=json.loads(m.group(2))
        except Exception: continue
        if not pts or not isinstance(pts[0],list) or len(pts[0])!=2: continue
        q=np.array([P(x,y) for x,y in pts],np.int32)
        cv2.polylines(c,[q.reshape(-1,1,2)],False,(255,0,255),2)
        for p in q: cv2.circle(c,tuple(int(v) for v in p),3,(0,255,0),-1)
        cv2.putText(c,name,tuple(int(v) for v in q[0]),0,0.45,(255,0,255),1)
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,90])
