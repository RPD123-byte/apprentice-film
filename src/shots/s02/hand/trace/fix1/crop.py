#!/usr/bin/env python3
# crop.py F x0 y0 x1 y1 out.jpg [--r RDIR] [--s SCALE] [--g GRID] : source crop (and render crop above it) with a labelled grid
import cv2, sys, numpy as np, os
a=sys.argv; F=int(a[1]); x0,y0,x1,y1=map(int,a[2:6]); out=a[6]
def opt(k,d):
    return a[a.index(k)+1] if k in a else d
R=opt('--r',None); S=float(opt('--s','2')); G=int(opt('--g','50'))
D=os.path.dirname(os.path.abspath(__file__))
def grid(im):
    im=im[y0:y1,x0:x1].copy(); im=cv2.resize(im,None,fx=S,fy=S,interpolation=cv2.INTER_CUBIC if S>1 else cv2.INTER_AREA)
    for x in range((x0//G+1)*G,x1,G):
        X=int((x-x0)*S); cv2.line(im,(X,0),(X,im.shape[0]),(0,200,255) if x%(2*G) else (0,0,255),1); cv2.putText(im,str(x),(X+2,12),0,0.4,(0,255,255),1)
    for y in range((y0//G+1)*G,y1,G):
        Y=int((y-y0)*S); cv2.line(im,(0,Y),(im.shape[1],Y),(0,200,255) if y%(2*G) else (0,0,255),1); cv2.putText(im,str(y),(2,Y-3),0,0.4,(0,255,255),1)
    return im
s=cv2.imread(f'{D}/../s02-fix1h-src/{F:04d}.png')
ims=[]
if R:
    r=cv2.imread(f'{R}/r{F:04d}.png'); ims.append(grid(r))
ims.append(grid(s))
out_im=np.vstack(ims) if (x1-x0)>(y1-y0)*1.2 else np.hstack(ims)
cv2.imwrite(out,out_im,[cv2.IMWRITE_JPEG_QUALITY,90])
