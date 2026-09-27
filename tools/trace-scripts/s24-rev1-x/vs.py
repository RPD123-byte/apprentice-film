# usage: vs.py render.png srcidx out.jpg [x0 y0 x1 y1] [--w W]   (stack render over source, crop)
import cv2, sys, numpy as np
a=sys.argv[1:]; w=1600
if '--w' in a: i=a.index('--w'); w=int(a[i+1]); del a[i:i+2]
r=cv2.imread(a[0]); s=cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s24-rev1-src/f_%05d.png'%int(a[1]))
if len(a)>=7: x0,y0,x1,y1=map(int,a[3:7]); r=r[y0:y1,x0:x1]; s=s[y0:y1,x0:x1]
def lab(im,t):
    im=im.copy(); cv2.putText(im,t,(10,40),cv2.FONT_HERSHEY_SIMPLEX,1.2,(0,0,255),3); return im
st=np.vstack([lab(r,'render'),np.full((6,r.shape[1],3),(0,0,200),np.uint8),lab(s,'source f%d'%(2400+int(a[1])))])
sc=w/st.shape[1]; st=cv2.resize(st,(w,int(st.shape[0]*sc)),interpolation=cv2.INTER_AREA)
cv2.imwrite(a[2],st,[cv2.IMWRITE_JPEG_QUALITY,88])
