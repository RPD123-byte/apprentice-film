# score.py DIR [ref_t] — owl mask (lum>150, opened) of each render (crop relative to the cup) vs the source sprite at 75.00
import cv2, numpy as np, glob, re, sys, math
d=sys.argv[1]
TOP=dict()
for l in open('snapshots/s22-fix1-study/top-track.txt'):
    p=l.split()
    if len(p)>3 and p[1]=='T': TOP[round(float(p[0]),2)]=(float(p[2]),float(p[3]))
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES,1875); ok,REF=c.read()
def crop(im,cx,cy):
    M=np.float32([[1,0,-(cx-118)],[0,1,-(cy-48)]])
    return cv2.warpAffine(im,M,(323,146),flags=cv2.INTER_LINEAR)
def mask(im):
    g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY); m=(g>150).astype(np.uint8)
    return cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
B=crop(REF,773.0,80.0); mb=mask(B)
bl=lambda im: cv2.GaussianBlur(cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),3)
tiles=[]
for f in sorted(glob.glob(d+'/frame-*.png')):
    t=float(re.search(r'-at-([\d.]+)s',f).group(1))
    n=math.ceil(t*25-1e-3); T=round(n/25,2)
    if T not in TOP: continue
    A=crop(cv2.imread(f),*TOP[T]); ma=mask(A)
    iou=(ma&mb).sum()/max(1,(ma|mb).sum())
    u=(ma|mb)>0; mad=np.abs(bl(A)-bl(B))[u].mean()
    ya,xa=np.nonzero(ma); yb,xb=np.nonzero(mb)
    print(f"{T:.2f} IoU {iou:.3f} area {ma.sum()}/{mb.sum()} dc ({xa.mean()-xb.mean():+.1f},{ya.mean()-yb.mean():+.1f}) blurMAD {mad:.1f} p90 {np.percentile(cv2.cvtColor(A,cv2.COLOR_BGR2GRAY)[ma>0],90):.0f}/{np.percentile(cv2.cvtColor(B,cv2.COLOR_BGR2GRAY)[mb>0],90):.0f}")
    O=cv2.cvtColor(cv2.cvtColor(B,cv2.COLOR_BGR2GRAY),cv2.COLOR_GRAY2BGR)
    O=cv2.resize(O,None,fx=2,fy=2)
    ca,_=cv2.findContours(cv2.resize(ma,None,fx=2,fy=2),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    cb,_=cv2.findContours(cv2.resize(mb,None,fx=2,fy=2),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    cv2.drawContours(O,cb,-1,(0,255,0),1); cv2.drawContours(O,ca,-1,(0,0,255),1)
    cv2.putText(O,f"{T:.2f} {iou:.3f}",(4,14),0,0.45,(0,255,255),1)
    tiles.append(np.hstack([cv2.resize(A,None,fx=2,fy=2),O]))
if tiles:
    cv2.imwrite(d+'/score.jpg',np.vstack(tiles),[cv2.IMWRITE_JPEG_QUALITY,88])
