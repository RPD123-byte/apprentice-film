import cv2, glob, re, sys, numpy as np
d=sys.argv[1]; out=sys.argv[2]
def box(t):
    if t<70.9: return (0,600,560,946)
    if t<71.99: return (180,600,640,946)
    if t<72.3: return (180,380,640,946)
    if t<72.6: return (80,150,560,700)
    if t<73.0: return (60,0,500,420)
    return (100,0,640,300)
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
if len(sys.argv)>3: sel=set(sys.argv[3].split(','))
else: sel=None
tiles=[]
for f in fs:
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    if sel and str(t) not in sel and f"{t:g}" not in sel: continue
    r=f.replace('frame-','ref-')
    a=cv2.imread(f); b=cv2.imread(r)
    x0,y0,x1,y1=box(t)
    ca=a[y0:y1,x0:x1]; cb=b[y0:y1,x0:x1]
    sc=min(2.0, 900/(x1-x0))
    ca=cv2.resize(ca,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC); cb=cv2.resize(cb,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
    im=np.hstack([ca,np.full((ca.shape[0],6,3),80,np.uint8),cb])
    cv2.putText(im,f"{t:.2f} render | source",(8,28),cv2.FONT_HERSHEY_SIMPLEX,0.8,(0,0,255),2)
    cv2.imwrite(f"{out}/crop-{t:.2f}.jpg",im,[cv2.IMWRITE_JPEG_QUALITY,90])
print('ok')
