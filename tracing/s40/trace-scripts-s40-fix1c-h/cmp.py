#!/usr/bin/env python3
# cmp.py t1,t2,... x0 y0 x1 y1 scale out.jpg [--norender] [--grid N]
# renders the times with the local harness (exact t), pairs crops render | source (source frame round(t*25))
import cv2, sys, os, subprocess, numpy as np
H=os.path.dirname(os.path.abspath(__file__))
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
args=[a for a in sys.argv[1:] if not a.startswith('--')]
opts=sys.argv[1:]
times=[float(v) for v in args[0].split(',')]
x0,y0,x1,y1=[int(v) for v in args[1:5]]; s=float(args[5]); out=args[6]
grid=int(opts[opts.index('--grid')+1]) if '--grid' in opts else 0
if '--norender' not in opts:
    r=subprocess.run(['node','run.mjs','out',','.join(str(t) for t in times)],cwd=H,capture_output=True,text=True)
    print(r.stdout.strip().replace('\n',' | ')); 
    if r.stderr.strip(): print(r.stderr[-2000:])
os.makedirs(H+'/src',exist_ok=True)
def src(t):
    fi=int(round(t*25)); p=f'{H}/src/f{fi}.png'
    if not os.path.exists(p):
        c=cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES,fi); ok,f=c.read(); cv2.imwrite(p,f)
    return cv2.imread(p)
rows=[]
for t in times:
    a=cv2.imread(f'{H}/out/r-{t:.3f}.png')[y0:y1,x0:x1]; b=src(t)[y0:y1,x0:x1]
    ip=cv2.INTER_NEAREST if s>=3 else cv2.INTER_AREA if s<1 else cv2.INTER_CUBIC
    a=cv2.resize(a,None,fx=s,fy=s,interpolation=ip); b=cv2.resize(b,None,fx=s,fy=s,interpolation=ip)
    if grid:
        for im in (a,b):
            for x in range((x0//grid+1)*grid,x1,grid):
                X=int((x-x0)*s); cv2.line(im,(X,0),(X,im.shape[0]),(255,255,0) if x%(grid*5) else (0,0,255),1)
                cv2.putText(im,str(x),(X+2,12),0,0.35,(0,255,0),1)
            for y in range((y0//grid+1)*grid,y1,grid):
                Y=int((y-y0)*s); cv2.line(im,(0,Y),(im.shape[1],Y),(255,255,0) if y%(grid*5) else (0,0,255),1)
                cv2.putText(im,str(y),(2,Y-2),0,0.35,(0,255,0),1)
    sep=np.full((a.shape[0],4,3),255,np.uint8)
    row=np.hstack([a,sep,b]); cv2.putText(row,f'{t:.2f}',(4,a.shape[0]-6),0,0.6,(0,255,0),2); rows.append(row)
    rows.append(np.full((4,row.shape[1],3),255,np.uint8))
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,92]); print('wrote',out)
