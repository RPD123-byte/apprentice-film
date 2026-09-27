#!/usr/bin/env python3
# metrics.py DIR : per pair: owl IoU, MAE (σ1.5-blurred grey) over the dilated union of the owl masks, band-pass
# energy ratio R/S (fine: G0.6-G1.5, mid: G1.5-G3.5) inside the intersection, and the mean inside the owl.
import cv2, glob, re, sys, numpy as np
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s21-p2-tools')
from masks import mask, bgR, bgS, g
from crop import box
d=sys.argv[1]
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
G=lambda im,s: cv2.GaussianBlur(im,(0,0),s)
tot=[]
print('   t    IoU   MAE  fine  mid   meanR/S')
for f in fs:
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    R0=cv2.cvtColor(cv2.imread(f),cv2.COLOR_BGR2GRAY).astype(np.float32); S0=cv2.cvtColor(cv2.imread(f.replace('frame-','ref-')),cv2.COLOR_BGR2GRAY).astype(np.float32)
    R=g(f); S=g(f.replace('frame-','ref-'))
    x0,y0,x1,y1=box(t); x0=max(0,x0-40); y0=max(0,y0-40); x1=min(2206,x1+40); y1=min(946,y1+40)
    mr=mask(R,bgR,(x0,y0,x1,y1),t); ms=mask(S,bgS,(x0,y0,x1,y1),t)
    iou=(mr&ms).sum()/max(1,(mr|ms).sum())
    un=cv2.dilate((mr|ms).astype(np.uint8),np.ones((9,9),np.uint8))>0
    it=cv2.erode((mr&ms).astype(np.uint8),np.ones((5,5),np.uint8))>0
    Rc=R0[y0:y1,x0:x1]; Sc=S0[y0:y1,x0:x1]
    mae=np.abs(G(Rc,1.5)-G(Sc,1.5))[un].mean()
    def band(im,a,b): return (G(im,a)-G(im,b))[it].std()
    fine=band(Rc,0.6,1.5)/max(1e-3,band(Sc,0.6,1.5)); mid=band(Rc,1.5,3.5)/max(1e-3,band(Sc,1.5,3.5))
    print(f'{t:7.3f} {iou:5.2f} {mae:5.1f} {fine:5.2f} {mid:5.2f}  {Rc[mr>0].mean():5.0f}/{Sc[ms>0].mean():<5.0f}')
    tot.append((iou,mae,fine,mid))
a=np.array(tot); print('mean   %5.2f %5.1f %5.2f %5.2f'%tuple(a.mean(0)))
