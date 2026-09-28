import sys,cv2,numpy as np; sys.path.insert(0,'.')
from lab import src
from owlm import mask, gray
K=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9))
def energy(im,m):
    g=cv2.GaussianBlur(gray(im),(0,0),0.8); bh=cv2.morphologyEx(g,cv2.MORPH_BLACKHAT,K); return float(bh[m].mean()), float((bh[m]>12).mean())
d=sys.argv[1]; ts=[float(x) for x in sys.argv[2].split(',')]
for t in ts:
    m=mask(t,0); m=cv2.erode(m.astype(np.uint8),np.ones((9,9),np.uint8))>0
    a=energy(cv2.imread(f'{d}/f{t:.2f}.jpg'),m); b=energy(src(t),m)
    print(t,'ren %.2f %.3f | src %.2f %.3f'%(a[0],a[1],b[0],b[1]))
