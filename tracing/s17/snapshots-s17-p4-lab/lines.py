# dark-line maps (black-hat) inside the owl: render | source, for spotting missing structure lines
import sys,cv2,numpy as np; sys.path.insert(0,'.')
from lab import src
from owlm import mask, gray
d=sys.argv[1]; ts=[float(x) for x in sys.argv[2].split(',')]; out=sys.argv[3]
x0,y0,x1,y1=[int(v) for v in sys.argv[4].split(',')]; sc=float(sys.argv[5]) if len(sys.argv)>5 else 2
K=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9))
rows=[]
for t in ts:
    m=mask(t,2)
    ims=[]
    for im in [cv2.imread(f'{d}/f{t:.2f}.jpg'), src(t)]:
        g=cv2.GaussianBlur(gray(im),(0,0),0.8)
        bh=cv2.morphologyEx(g,cv2.MORPH_BLACKHAT,K); bh[~m]=0
        v=np.clip(255-bh*3,0,255).astype(np.uint8)[y0:y1,x0:x1]
        ims.append(cv2.resize(v,None,fx=sc,fy=sc))
    r=np.hstack([ims[0],np.full((ims[0].shape[0],4),0,np.uint8),ims[1]]); cv2.putText(r,f'{t:.2f}',(4,18),0,0.6,0,2); rows.append(r)
cv2.imwrite(out,np.vstack(rows))
