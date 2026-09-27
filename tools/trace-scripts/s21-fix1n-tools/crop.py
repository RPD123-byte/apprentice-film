#!/usr/bin/env python3
# crop.py DIR out.jpg [--z 3] [--half 120] : for each frame/ref pair in DIR, crop round the owl's head and stack render|source
import cv2, glob, re, sys, numpy as np
def interp(keys,t):
    if t<=keys[0][0]: return keys[0][1:]
    for i in range(len(keys)-1):
        if t<=keys[i+1][0]:
            u=(t-keys[i][0])/(keys[i+1][0]-keys[i][0]); return [p+(q-p)*u for p,q in zip(keys[i][1:],keys[i+1][1:])]
    return keys[-1][1:]
HOLD=[[70.845,364,790],[70.92,366,787],[71.04,365,783],[71.64,365,783],[71.72,377,790],[71.8,388,796],[71.98,390,795]]
FLY=[[71.98,390,795],[72.0,395,790],[72.04,415,729],[72.08,426,679],[72.12,433,632],[72.16,427,587],[72.2,417,547],[72.24,399,516],[72.28,370,479],[72.32,336,443],[72.36,308,411],[72.4,282,381],[72.44,260,344],[72.48,238,306],[72.52,233,253],[72.56,230,213],[72.6,236,153],[72.64,230,96],[72.68,235,63],[72.72,237,52],[72.76,240,44],[72.8,237,48],[72.84,240,50],[72.92,240,64],[73.0,240,76],[73.04,244,84]]
TOP=[[73.0,240,76],[73.08,248,90],[73.2,258,92],[73.28,275,91],[73.36,281,89],[73.52,283,88],[73.72,304,88],[73.92,332,89],[74.2,360,92],[74.48,406,95],[74.52,412,95]]
FLYC=[[71.98,393,793.5],[72.0,390,788],[72.04,403,736],[72.08,417,686],[72.12,424,635],[72.16,420,585],[72.2,411,544],[72.24,393,513],[72.28,367,478],[72.32,331,441],[72.36,304,410],[72.4,279,382],[72.44,253,349],[72.48,233,308],[72.52,226,261],[72.56,220,215],[72.6,221,157],[72.64,222,114],[72.68,227,79],[72.72,231,56],[72.76,233,40],[72.8,236,44],[72.84,233,38],[72.92,243,63],[73.0,247,74],[73.04,250,80]]
TOPC=[[73.0,247,74],[73.08,252,90],[73.16,252,89],[73.2,256.5,86],[73.24,264.5,84],[73.28,271.5,84],[73.32,276.5,84],[73.36,279.5,85],[73.56,282.5,85],[73.6,287.5,85],[73.68,296.5,85],[73.76,305.5,85],[73.84,315.5,85],[73.92,327.5,85],[73.96,327.5,85],[74.0,332.5,85],[74.08,343.5,85],[74.16,352.5,85],[74.24,363.5,85],[74.32,375.5,85],[74.4,388.5,85],[74.48,400.5,85],[74.52,406,85]]
def centre(t):
    if t<71.98: h=head(t); return [h[0]+3,h[1]-1.5]
    if t<73.02: return interp(FLYC,t)
    return interp(TOPC,t)
def head(t):
    if t<70.845: return [205+246*(t-70.2),790]
    if t<71.98: return interp(HOLD,t)
    if t<73.02: return interp(FLY,t)
    return interp(TOP,t)
def box(t):
    hx,hy=head(t)
    if t>=73.02: return (int(hx-110),max(0,int(hy-80)),int(hx+200),int(hy+110))
    if t>=72.0: return (int(hx-170),int(hy-110),int(hx+130),int(hy+150))
    return (int(hx-100),int(hy-60),int(hx+90),int(hy+110))
if __name__=='__main__':
    d=sys.argv[1]; out=sys.argv[2]; a=sys.argv[3:]
    z=float(a[a.index('--z')+1]) if '--z' in a else 3.0
    fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
    rows=[]
    for f in fs:
        t=float(re.search(r'at-([\d.]+)s',f).group(1))
        A=cv2.imread(f); B=cv2.imread(f.replace('frame-','ref-'))
        x0,y0,x1,y1=box(t); x0=max(0,x0); y0=max(0,y0)
        zz=min(z, 700/(x1-x0))
        ca=cv2.resize(A[y0:y1,x0:x1],None,fx=zz,fy=zz,interpolation=cv2.INTER_CUBIC); cb=cv2.resize(B[y0:y1,x0:x1],None,fx=zz,fy=zz,interpolation=cv2.INTER_CUBIC)
        for c,l in ((ca,'R'),(cb,'S')): cv2.putText(c,f'{l} {t:.3f}',(6,22),0,0.7,(0,255,255),2)
        rows.append(np.hstack([ca,np.full((ca.shape[0],4,3),(0,0,255),np.uint8),cb]))
    W=max(r.shape[1] for r in rows)
    rows=[np.pad(r,((0,4),(0,W-r.shape[1]),(0,0))) for r in rows]
    # split into multiple images if tall
    H=sum(r.shape[0] for r in rows); maxh=2400
    cur=[];k=0;hh=0
    outs=[]
    for r in rows:
        if hh+r.shape[0]>maxh and cur: outs.append(np.vstack(cur)); cur=[]; hh=0
        cur.append(r); hh+=r.shape[0]
    if cur: outs.append(np.vstack(cur))
    for i,o in enumerate(outs):
        cv2.imwrite(out.replace('.jpg',f'-{i}.jpg'),o,[cv2.IMWRITE_JPEG_QUALITY,88]); print(out.replace('.jpg',f'-{i}.jpg'))
