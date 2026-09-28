import cv2,numpy as np,sys,glob,re
# crop.py snapdir framesfile n x0 y0 x1 y1 out [--stack v|h] [--scale s]
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s23rev1/'
a=sys.argv[1:]; st='v'; sc=1.0
if '--stack' in a: i=a.index('--stack'); st=a[i+1]; del a[i:i+2]
if '--scale' in a: i=a.index('--scale'); sc=float(a[i+1]); del a[i:i+2]
d,ff,n=a[0],a[1],int(a[2]); x0,y0,x1,y1=map(int,a[3:7]); out=a[7]
FL=[int(x) for x in open(ff).read().strip().split(',')]
idx=FL.index(n)
p=[q for q in glob.glob(d+'/frame-*.png') if int(re.search(r'frame-(\d+)-',q).group(1))==idx][0]
r=cv2.imread(p); s=cv2.imread(SP+'src/n%05d.png'%n)
A=r[y0:y1,x0:x1]; B=s[y0:y1,x0:x1]
sep=np.full((4,A.shape[1],3),(0,200,255),np.uint8) if st=='v' else np.full((A.shape[0],4,3),(0,200,255),np.uint8)
P=np.vstack([A,sep,B]) if st=='v' else np.hstack([A,sep,B])
if sc!=1: P=cv2.resize(P,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
cv2.imwrite(out,P,[cv2.IMWRITE_JPEG_QUALITY,90])
