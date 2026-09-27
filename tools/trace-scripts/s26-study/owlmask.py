# owlmask.py dir [x0 y0 x1 y1]: bright low-saturation blob (the white owl) in render vs source: bbox, centroid, IoU
import cv2, numpy as np, glob, sys, re
d=sys.argv[1]; box=[int(v) for v in sys.argv[2:6]] if len(sys.argv)>5 else [600,250,1700,946]
def mask(im):
    x0,y0,x1,y1=box; r=im[y0:y1,x0:x1]
    hsv=cv2.cvtColor(cv2.GaussianBlur(r,(0,0),2),cv2.COLOR_BGR2HSV)
    m=((hsv[...,2]>175)&(hsv[...,1]<45)).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((11,11),np.uint8))
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((15,15),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(m)
    if n<2: return None
    i=1+np.argmax(st[1:,4]); M=np.zeros(im.shape[:2],bool); M[y0:y1,x0:x1]=lab==i
    return M, (st[i,0]+x0,st[i,1]+y0,st[i,0]+st[i,2]+x0,st[i,1]+st[i,3]+y0), (cen[i][0]+x0,cen[i][1]+y0)
for fr in sorted(glob.glob(d+'/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s',p).group(1))):
    tt=re.search(r'at-([\d.]+)s',fr).group(1)
    a=mask(cv2.imread(fr)); b=mask(cv2.imread(fr.replace('frame-','ref-')))
    if a is None or b is None: print(tt,'none'); continue
    iou=(a[0]&b[0]).sum()/max(1,(a[0]|b[0]).sum())
    print(f"{tt:>7} IoU={iou:.2f}  render bbox={a[1]} cen=({a[2][0]:.0f},{a[2][1]:.0f})  source bbox={b[1]} cen=({b[2][0]:.0f},{b[2][1]:.0f})")
