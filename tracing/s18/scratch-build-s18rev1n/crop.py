import cv2,numpy as np,sys,os
S='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18rev1n/src/'
rp,n,x0,y0,x1,y1,out=sys.argv[1],int(sys.argv[2]),*map(int,sys.argv[3:7]),sys.argv[7]
z=float(sys.argv[8]) if len(sys.argv)>8 else 2
r=cv2.imread(rp)[y0:y1,x0:x1]; s=cv2.imread(S+f'f{n:04d}.png')[y0:y1,x0:x1]
r=cv2.resize(r,None,fx=z,fy=z,interpolation=cv2.INTER_NEAREST if z>=2 else cv2.INTER_AREA); s=cv2.resize(s,None,fx=z,fy=z,interpolation=cv2.INTER_NEAREST if z>=2 else cv2.INTER_AREA)
sep=np.full((r.shape[0],6,3),(0,0,255),np.uint8)
cv2.imwrite(out,np.hstack([r,sep,s]),[cv2.IMWRITE_JPEG_QUALITY,92])
