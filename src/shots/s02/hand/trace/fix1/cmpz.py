import cv2, sys, numpy as np
# cmpz.py RDIR F x0 y0 x1 y1 out [scale] [gamma]  -> render | source crop, side by side
d,f=sys.argv[1],int(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]
S=float(sys.argv[8]) if len(sys.argv)>8 else 1; G=float(sys.argv[9]) if len(sys.argv)>9 else 1
r=cv2.imread(f'{d}/r{f:04d}.png'); s=cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s02-fix1h-src/{f:04d}.png')
g=lambda im: np.clip(255*(im.astype(np.float32)/255)**G,0,255).astype(np.uint8)
a=cv2.resize(g(r[y0:y1,x0:x1]),None,fx=S,fy=S,interpolation=cv2.INTER_CUBIC); b=cv2.resize(g(s[y0:y1,x0:x1]),None,fx=S,fy=S,interpolation=cv2.INTER_CUBIC)
sep=np.full((a.shape[0],4,3),(0,200,255),np.uint8)
cv2.imwrite(out,np.hstack([a,sep,b]),[cv2.IMWRITE_JPEG_QUALITY,90])
