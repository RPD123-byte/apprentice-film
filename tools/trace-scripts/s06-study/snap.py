#!/usr/bin/env python3
# snap.py T in.json out.json overlay.jpg [r] [x0 y0 x1 y1 zoom]
# in.json: {name: {"pts": [[x,y],...], "mode": "dark"|"light"|"none"}}. Each point moves to the darkness-weighted
# centroid (dark lines) or brightness-weighted centroid (light lines) within radius r. Overlay: before (red) / after (green).
import cv2, sys, json, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
t=float(sys.argv[1]); src=json.load(open(sys.argv[2])); outp=sys.argv[3]; ov=sys.argv[4]
r=int(sys.argv[5]) if len(sys.argv)>5 else 6
c=cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*c.get(5)))); ok,f=c.read()
g=cv2.GaussianBlur(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.2)
H,W=g.shape
out={}
for k,v in src.items():
    pts=v['pts']; mode=v.get('mode','dark'); rr=v.get('r',r); q=[]
    for x,y in pts:
        x0,x1=max(0,int(x-rr)),min(W,int(x+rr+1)); y0,y1=max(0,int(y-rr)),min(H,int(y+rr+1))
        win=g[y0:y1,x0:x1]
        if mode=='none' or win.size==0: q.append([x,y]); continue
        w=(255-win) if mode=='dark' else win
        w=np.clip(w-np.percentile(w,60),0,None)**2
        yy,xx=np.mgrid[y0:y1,x0:x1]
        m=((xx-x)**2+(yy-y)**2)<=rr*rr; w=w*m
        s=w.sum()
        q.append([round(float((w*xx).sum()/s),1),round(float((w*yy).sum()/s),1)] if s>0 else [x,y])
    out[k]={**v,'pts':q}
json.dump(out,open(outp,'w'))
im=f.copy()
for k in src:
    for P,col in ((src[k]['pts'],(0,0,255)),(out[k]['pts'],(0,255,0))):
        a=np.array(P,np.int32); cv2.polylines(im,[a],False,col,1)
        for p in a: cv2.circle(im,tuple(int(v) for v in p),2,col,-1)
    cv2.putText(im,k,tuple(int(v) for v in out[k]['pts'][0]),0,0.4,(255,255,0),1)
if len(sys.argv)>9:
    x0,y0,x1,y1=[int(v) for v in sys.argv[6:10]]; z=float(sys.argv[10]) if len(sys.argv)>10 else 1
    im=cv2.resize(im[y0:y1,x0:x1],None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)
cv2.imwrite(ov,im,[cv2.IMWRITE_JPEG_QUALITY,90])
print('ok',len(out))
