#!/usr/bin/env python3
# cen.py renderdir x0 y0 x1 y1 thr t... : bright-pixel centroid / extent in a box, source vs render
import cv2, numpy as np, sys
D='/Users/computer/rootline/apprentice-film/snapshots/s20-fix2-src'
rd=sys.argv[1]; x0,y0,x1,y1,thr=map(int,sys.argv[2:7])
def c(im):
    a=cv2.GaussianBlur(im[y0:y1,x0:x1],(0,0),2)>thr; ys,xs=np.nonzero(a)
    if len(xs)==0: return 'none'
    return f'cx {xs.mean()+x0:.0f} cy {ys.mean()+y0:.0f} x[{np.percentile(xs,3)+x0:.0f},{np.percentile(xs,97)+x0:.0f}] y[{np.percentile(ys,3)+y0:.0f},{np.percentile(ys,97)+y0:.0f}] n {len(xs)}'
for t in sys.argv[7:]:
    fr=int(round(float(t)*25)); s=cv2.imread(f'{D}/f_{fr}.png',0); r=cv2.imread(f'{rd}/r_{float(t):.2f}.png',0)
    print(t,fr,'SRC',c(s),'| R',c(r))
