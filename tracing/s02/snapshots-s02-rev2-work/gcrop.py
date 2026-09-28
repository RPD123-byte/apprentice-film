# gcrop.py f x0 y0 x1 y1 out [scale] [step] -> render|source crop stacked vertically with a labelled grid (frame coords)
import cv2, glob, re, sys, numpy as np
root='/Users/computer/rootline/apprentice-film/snapshots/'
f=int(sys.argv[1]); x0,y0,x1,y1=map(int,sys.argv[2:6]); out=sys.argv[6]; sc=float(sys.argv[7]) if len(sys.argv)>7 else 1; st=int(sys.argv[8]) if len(sys.argv)>8 else 50
rp=None
for d in ['s02-rev2-a','s02-rev2-b','s02-rev2-c','s02-rev2-d','s02-rev2-det1','s02-rev2-bnd']:
    for p in glob.glob(root+d+'/frame-*.png'):
        t=float(re.search(r'at-([\d.]+)s',p).group(1)); tt=int(t*30)/30
        if int(tt*25+0.5)==f: rp=p
r=cv2.imread(rp); s=cv2.imread(root+'s02-fix1h-src/%04d.png'%f)
def g(im):
    a=im[y0:y1,x0:x1].copy(); a=cv2.resize(a,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC if sc>1 else cv2.INTER_AREA)
    for x in range((x0//st+1)*st,x1,st):
        X=int((x-x0)*sc); cv2.line(a,(X,0),(X,a.shape[0]),(0,200,255),1); cv2.putText(a,str(x),(X+2,12),0,0.4,(0,200,255),1)
    for y in range((y0//st+1)*st,y1,st):
        Y=int((y-y0)*sc); cv2.line(a,(0,Y),(a.shape[1],Y),(0,200,255),1); cv2.putText(a,str(y),(2,Y-2),0,0.4,(0,200,255),1)
    return a
A=g(r); B=g(s)
im=np.vstack([A,np.full((6,A.shape[1],3),(0,0,255),np.uint8),B]) if A.shape[1]>A.shape[0]*1.3 else np.hstack([A,np.full((A.shape[0],6,3),(0,0,255),np.uint8),B])
cv2.imwrite(root+'s02-rev2-work/'+out,im,[cv2.IMWRITE_JPEG_QUALITY,90]); print(rp, im.shape)
