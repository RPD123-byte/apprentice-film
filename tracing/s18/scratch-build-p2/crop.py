# crop.py dir frame x0 y0 x1 y1 [scale] out : render|source crop, upscaled
import cv2, numpy as np, sys
d,f=sys.argv[1],int(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); sc=float(sys.argv[7]); out=sys.argv[8]
R=cv2.imread(f'{d}/r{f}.png'); S=cv2.imread(f'{d}/s{f}.png')
c=np.hstack([R[y0:y1,x0:x1],np.full((y1-y0,4,3),(0,0,255),np.uint8),S[y0:y1,x0:x1]])
cv2.imwrite(out,cv2.resize(c,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC if sc>1 else cv2.INTER_AREA),[cv2.IMWRITE_JPEG_QUALITY,90])
