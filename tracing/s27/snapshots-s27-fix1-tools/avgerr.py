# average blurred dE per 150-px block over all render frames in a dir (optionally t-range)
import cv2, numpy as np, sys, glob, re
from src import frame
d=sys.argv[1]; t0=float(sys.argv[2]) if len(sys.argv)>2 else 0; t1=float(sys.argv[3]) if len(sys.argv)>3 else 999
def lab(im): return cv2.cvtColor(cv2.GaussianBlur(im,(0,0),8).astype(np.float32)/255,cv2.COLOR_BGR2Lab)
acc=None; n=0
for f in sorted(glob.glob(d+'/frame-*.png')):
    t=float(re.search(r'at-([\d.]+?)s\.png',f).group(1))
    if not (t0<=t<=t1): continue
    e=np.linalg.norm(lab(cv2.imread(f))-lab(frame(t)),axis=2); acc=e if acc is None else acc+e; n+=1
acc/=n; bs=150
print('frames',n,'mean',acc.mean().round(2))
for y in range(0,946,bs): print(' '.join(f"{acc[y:y+bs,x:x+bs].mean():5.1f}" for x in range(0,2206,bs)))
