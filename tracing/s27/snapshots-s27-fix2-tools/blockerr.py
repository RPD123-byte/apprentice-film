# blockerr.py render.png T [bs] : blurred dE8 per block, and mean L diff sign
import cv2, numpy as np, sys
from src import frame
R=cv2.imread(sys.argv[1]); t=float(sys.argv[2]); bs=int(sys.argv[3]) if len(sys.argv)>3 else 150
def lab(im): return cv2.cvtColor(cv2.GaussianBlur(im,(0,0),8).astype(np.float32)/255,cv2.COLOR_BGR2Lab)
a=lab(R); b=lab(frame(t)); e=np.linalg.norm(a-b,axis=2); dl=a[...,0]-b[...,0]
print('mean',e.mean().round(2))
for y in range(0,946,bs): print(' '.join(f"{e[y:y+bs,x:x+bs].mean():4.0f}{'+' if dl[y:y+bs,x:x+bs].mean()>3 else '-' if dl[y:y+bs,x:x+bs].mean()<-3 else ' '}" for x in range(0,2206,bs)))
