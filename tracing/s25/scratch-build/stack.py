import cv2, numpy as np, sys, glob
# stack.py DIR T OUT [x0 y0 x1 y1] [width]
d,t,out=sys.argv[1],sys.argv[2],sys.argv[3]
box=[int(v) for v in sys.argv[4:8]] if len(sys.argv)>=8 else None
w=int(sys.argv[8]) if len(sys.argv)>8 else 1500
f=glob.glob(f'{d}/frame-*-at-{t}s.png')[0]; r=f.replace('frame-','ref-')
a=cv2.imread(f); b=cv2.imread(r)
if box: a=a[box[1]:box[3],box[0]:box[2]]; b=b[box[1]:box[3],box[0]:box[2]]
im=np.vstack([a,np.full((6,a.shape[1],3),(0,0,255),np.uint8),b])
sc=w/im.shape[1]
cv2.imwrite(out,cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA),[cv2.IMWRITE_JPEG_QUALITY,88])
