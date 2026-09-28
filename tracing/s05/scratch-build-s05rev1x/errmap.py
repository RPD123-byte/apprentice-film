import cv2, numpy as np, sys, glob, math
sys.path.insert(0,'/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s05rev1x')
from src_frames import get
f,k,out=sys.argv[1],int(sys.argv[2]),sys.argv[3]
a=cv2.imread(f).astype(np.float32).mean(2); b=get(k).astype(np.float32).mean(2)
B=lambda x: cv2.GaussianBlur(x,(0,0),3)
d=B(a)-B(b)
# grid of mean abs err in 128px cells
T=110
print('cells (row y, col x) mean |blurred diff|, signed (render-source)')
for y in range(0,946,T):
    print(f'y{y:4d} '+' '.join(f'{np.abs(d[y:y+T,x:x+T]).mean():4.0f}{"+" if d[y:y+T,x:x+T].mean()>2 else ("-" if d[y:y+T,x:x+T].mean()<-2 else " ")}' for x in range(0,2206,T)))
vis=np.clip(128+d*2,0,255).astype(np.uint8)
vis=cv2.applyColorMap(vis,cv2.COLORMAP_JET)
vis=cv2.resize(vis,None,fx=0.45,fy=0.45)
cv2.imwrite(out,vis)
