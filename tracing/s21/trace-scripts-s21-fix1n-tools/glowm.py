#!/usr/bin/env python3
# glowm.py DIR: top-margin measurements (render vs source) for frames in DIR
import cv2, glob, re, sys, numpy as np
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s21-fix1n-tools')
import masks as M
d=sys.argv[1]
g=lambda p: cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY).astype(np.float32)
for f in sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1))):
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    if t<72.6: continue
    R=g(f); S=g(f.replace('frame-','ref-'))
    out=[f'{t:.3f}']
    # owl hull above y=128: mask = bright-ish region connected to the owl, filled
    for name,im,bg in (('R',R,M.bgR),('S',S,M.bgS)):
        b=(0,0,700,128)
        m=M.mask(cv2.GaussianBlur(im,(0,0),1.2),bg,b,t)
        hull=np.zeros_like(m)
        cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
        if cs:
            h=cv2.convexHull(np.vstack(cs)); cv2.drawContours(hull,[h],-1,1,-1)
        v=im[0:128,0:700][hull>0]
        if len(v): out.append(f'{name}: p5 {np.percentile(v,5):5.1f} dark {100*(v<90).mean():4.1f}% mean {v.mean():5.1f}')
    bx=lambda im,x0,y0,x1,y1: im[y0:y1,x0:x1].mean()
    out.append(f'box0-150/0-60 R {bx(R,0,0,150,60):.1f} S {bx(S,0,0,150,60):.1f}')
    out.append(f'top450-650/0-60 R {bx(R,450,0,650,60):.1f} S {bx(S,450,0,650,60):.1f}')
    print(' | '.join(out))
    Rb=cv2.GaussianBlur(R,(0,0),5); Sb=cv2.GaussianBlur(S,(0,0),5)
    for y in (15,60):
        print('   y=%d '%y+' '.join(f'{x}:{Rb[y,x]:.0f}/{Sb[y,x]:.0f}' for x in range(150,951,100)))
