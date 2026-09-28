#!/usr/bin/env python3
# measurement only: source owl silhouette per frame = bright pixels that differ from the owl-free room
# usage: owlmask.py t1,t2,... [renderdir]   (renderdir with owl-only renders r_T.png -> IoU, offsets)
import cv2, numpy as np, sys, os
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
ST='/Users/computer/rootline/apprentice-film/snapshots/s20-b3-study/'
bgL=cv2.cvtColor(cv2.imread(ST+'bgL.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
bgR=cv2.cvtColor(cv2.imread(ST+'bgR.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
B1=np.float32([[0.9846,-0.0002,0.95],[-0.0003,0.9698,-3.1]]); B2=np.float32([[0.9910,-0.0007,-7.95],[-0.0003,0.9649,1.1]])
c=cv2.VideoCapture(V)
import json
CARDQ={int(k):v for k,v in json.load(open(ST+'cardq.json')).items()} if os.path.exists(ST+'cardq.json') else None
def srcmask(t):
    fr=int(round(t*25)); c.set(1,fr); ok,im=c.read(); g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32)
    # owl near the card (x>1000) -> background with owl on the left, and vice versa: choose per pixel the bg that differs least
    b1,b2=bgL,bgR
    if fr>=1671:
        A=B1 if fr<1685 else B2
        b1=cv2.warpAffine(bgL,A,(2206,946)); b2=cv2.warpAffine(bgR,A,(2206,946))
    dark=cv2.erode((np.minimum(b1,b2)<80).astype(np.uint8),np.ones((3,3),np.uint8))
    m=((g>115)&(dark>0)).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8)); m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
    n,lab,stats,cent=cv2.connectedComponentsWithStats(m)
    if n>1:
        k=1+np.argmax(stats[1:,4]); m=(lab==k).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((15,15),np.uint8))
    if CARDQ is not None and fr in CARDQ:   # remove the card (its quad, measured in card.js terms) from the mask
        cm=np.zeros_like(m); cv2.fillPoly(cm,[np.int32(CARDQ[fr])],1); cm=cv2.dilate(cm,np.ones((7,7),np.uint8)); m=m&(1-cm)
    return m,im
def desc(m):
    ys,xs=np.nonzero(m)
    if len(xs)==0: return 'empty'
    return f"bbox=({xs.min()},{ys.min()})-({xs.max()},{ys.max()}) c=({xs.mean():.0f},{ys.mean():.0f}) area={len(xs)}"
ts=[float(v) for v in sys.argv[1].split(',')]; rd=sys.argv[2] if len(sys.argv)>2 else None
os.makedirs(ST+'masks',exist_ok=True)
for t in ts:
    m,im=srcmask(t)
    cv2.imwrite(ST+f'masks/m_{t:.2f}.png',m*255)
    line=f"t={t:.2f} src {desc(m)}"
    if rd and os.path.exists(f"{rd}/r_{t:.2f}.png"):
        r=cv2.cvtColor(cv2.imread(f"{rd}/r_{t:.2f}.png"),cv2.COLOR_BGR2GRAY); rm=(r>60).astype(np.uint8)
        rm=cv2.morphologyEx(rm,cv2.MORPH_CLOSE,np.ones((15,15),np.uint8))
        inter=(m&rm).sum(); uni=(m|rm).sum(); line+=f"\n        mine {desc(rm)} IoU={inter/max(1,uni):.3f}"
        ov=im.copy(); cnt,_=cv2.findContours(rm,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); cv2.drawContours(ov,cnt,-1,(0,0,255),2)
        cnt2,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); cv2.drawContours(ov,cnt2,-1,(0,255,0),1)
        ys,xs=np.nonzero(m|rm); x0,y0,x1,y1=max(0,xs.min()-40),max(0,ys.min()-40),min(2206,xs.max()+40),min(946,ys.max()+40)
        cv2.imwrite(f"{rd}/fit_{t:.2f}.jpg",ov[y0:y1,x0:x1])
    print(line)
