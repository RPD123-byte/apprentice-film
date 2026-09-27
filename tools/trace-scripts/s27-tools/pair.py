# pair.py outdir : render | source pairs for every r-T.png in outdir (source frames from the scratch dump)
import cv2, glob, sys, re, numpy as np
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s27-meas')
from common import load
out=sys.argv[1]; scale=float(sys.argv[2]) if len(sys.argv)>2 else 0.5
for f in sorted(glob.glob(out+'/r-*.png')):
    t=float(re.search(r'r-([\d.]+)\.png',f).group(1))
    a=cv2.imread(f); b=load(t)
    p=np.hstack([a,b]); p=cv2.resize(p,None,fx=scale,fy=scale,interpolation=cv2.INTER_AREA)
    cv2.putText(p,f"{t:.2f} render | source",(8,22),0,0.7,(0,255,255),2)
    cv2.imwrite(f.replace('/r-','/p-').replace('.png','.jpg'),p,[cv2.IMWRITE_JPEG_QUALITY,88])
