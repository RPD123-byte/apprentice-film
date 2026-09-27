#!/usr/bin/env python3
# masks.py DIR [--thr 28] [--sheet out.jpg]: owl masks (difference from a median background of 70.0/71.2/74.4) for
# render and source; prints IoU, centroid, bbox, area and the mean inside the owl; writes an overlay sheet.
import cv2, glob, re, sys, numpy as np
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s21-fix1-tools')
a=sys.argv[2:]
thr=float(a[a.index('--thr')+1]) if '--thr' in a else 28
BG='/Users/computer/rootline/apprentice-film/snapshots/s21-fix1-bg'
g=lambda p: cv2.GaussianBlur(cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.2)
bgR=np.median(np.stack([g(p) for p in sorted(glob.glob(BG+'/frame-*.png'))]),0)
bgS=np.median(np.stack([g(p) for p in sorted(glob.glob(BG+'/ref-*.png'))]),0)
from crop import head, box
def mask(im,bg,b,t):
    x0,y0,x1,y1=b
    df=np.abs(im-bg)[y0:y1,x0:x1]
    m=((df>thr)&(im[y0:y1,x0:x1]>100)).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((7,7),np.uint8))
    # keep the largest component
    n,lab,st,_=cv2.connectedComponentsWithStats(m)
    if n>1:
        k=1+np.argmax(st[1:,cv2.CC_STAT_AREA]); m=(lab==k).astype(np.uint8)
    cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    m=np.zeros_like(m); cv2.drawContours(m,cs,-1,1,-1)
    return m
def main(d,sheet):
    fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
    tiles=[]
    print(' t      IoU   area R/S      cx R/S       cy R/S      bbox R | S                     mean R/S')
    for f in fs:
        t=float(re.search(r'at-([\d.]+)s',f).group(1))
        R=g(f); S=g(f.replace('frame-','ref-'))
        x0,y0,x1,y1=box(t); x0=max(0,x0-40); y0=max(0,y0-40); x1=min(2206,x1+40); y1=min(946,y1+40)
        b=(x0,y0,x1,y1)
        mr=mask(R,bgR,b,t); ms=mask(S,bgS,b,t)
        inter=(mr&ms).sum(); uni=(mr|ms).sum(); iou=inter/max(1,uni)
        def st(m,im):
            ys,xs=np.nonzero(m)
            if len(xs)==0: return (0,0,0,(0,0,0,0),0)
            return (len(xs),xs.mean()+x0,ys.mean()+y0,(xs.min()+x0,ys.min()+y0,xs.max()+x0,ys.max()+y0),im[y0:y1,x0:x1][m>0].mean())
        a1=st(mr,R); a2=st(ms,S)
        print(f'{t:6.3f} {iou:5.2f} {a1[0]:6d}/{a2[0]:<6d} {a1[1]:6.1f}/{a2[1]:<6.1f} {a1[2]:6.1f}/{a2[2]:<6.1f} {str(a1[3]):22s}|{str(a2[3]):22s} {a1[4]:5.0f}/{a2[4]:<5.0f}')
        ov=np.zeros((y1-y0,x1-x0,3),np.uint8); ov[...,2]=mr*255; ov[...,1]=ms*255
        base=cv2.cvtColor(S[y0:y1,x0:x1].astype(np.uint8),cv2.COLOR_GRAY2BGR)//3
        o=cv2.addWeighted(base,1,ov,0.7,0)
        cv2.putText(o,f'{t:.3f} IoU {iou:.2f}',(4,16),0,0.5,(255,255,255),1)
        tiles.append(o)
    if tiles:
        H=max(t.shape[0] for t in tiles); W=max(t.shape[1] for t in tiles)
        tiles=[np.pad(t,((0,H-t.shape[0]+2),(0,W-t.shape[1]+2),(0,0))) for t in tiles]
        cols=4
        while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
        rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
        s=np.vstack(rows)
        if s.shape[1]>2400: s=cv2.resize(s,(2400,int(s.shape[0]*2400/s.shape[1])))
        cv2.imwrite(sheet,s)
if __name__=='__main__':
    main(sys.argv[1], sys.argv[sys.argv.index('--sheet')+1] if '--sheet' in sys.argv else sys.argv[1]+'/masks.jpg')
