import cv2, sys, numpy as np
D='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s16rev1'
rp, n, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
x0,y0,x1,y1=map(int,sys.argv[4:8]); z=float(sys.argv[8]) if len(sys.argv)>8 else 1
r=cv2.imread(rp)[y0:y1,x0:x1]; s=cv2.imread(f'{D}/src/f{n}.png')[y0:y1,x0:x1]
im=np.hstack([r,np.full((r.shape[0],6,3),(0,0,255),np.uint8),s])
if z!=1: im=cv2.resize(im,None,fx=z,fy=z,interpolation=cv2.INTER_NEAREST if z>1 else cv2.INTER_AREA)
cv2.imwrite(out,im)
