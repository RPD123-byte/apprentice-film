import cv2, glob, re, sys, numpy as np, os
# owl crops: per time, find region from args list "t:x0,y0,x1,y1"
d=sys.argv[1]; out=sys.argv[2]; os.makedirs(out,exist_ok=True)
spec={}
for a in sys.argv[3:]:
    t,c=a.split(':'); spec[float(t)]=list(map(int,c.split(',')))
tiles=[]
for f in sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1))):
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    if t not in spec: continue
    x0,y0,x1,y1=spec[t]
    a=cv2.imread(f)[y0:y1,x0:x1]; b=cv2.imread(f.replace('frame-','ref-'))[y0:y1,x0:x1]
    s=600/a.shape[1]
    a=cv2.resize(a,None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC); b=cv2.resize(b,None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC)
    im=np.hstack([a,np.full((a.shape[0],4,3),(0,0,255),np.uint8),b])
    cv2.putText(im,f'{t}',(6,22),0,0.7,(0,255,255),2)
    cv2.imwrite(f'{out}/owl-{t:07.3f}.jpg',im,[cv2.IMWRITE_JPEG_QUALITY,90])
