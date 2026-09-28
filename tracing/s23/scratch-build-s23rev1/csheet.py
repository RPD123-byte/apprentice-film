import cv2,numpy as np,sys,glob,re
# csheet.py snapdir framesfile "n1,n2,..." x0 y0 x1 y1 out [--w W]  -> rows: render | source
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s23rev1/'
a=sys.argv[1:]; W=1800
if '--w' in a: i=a.index('--w'); W=int(a[i+1]); del a[i:i+2]
d,ff,ns=a[0],a[1],[int(x) for x in a[2].split(',')]; x0,y0,x1,y1=map(int,a[3:7]); out=a[7]
FL=[int(x) for x in open(ff).read().strip().split(',')]
files={int(re.search(r'frame-(\d+)-',q).group(1)):q for q in glob.glob(d+'/frame-*.png')}
rows=[]
for n in ns:
    r=cv2.imread(files[FL.index(n)]); s=cv2.imread(SP+'src/n%05d.png'%n)
    A=r[y0:y1,x0:x1]; B=s[y0:y1,x0:x1]
    P=np.hstack([A,np.full((A.shape[0],6,3),(0,200,255),np.uint8),B])
    P=cv2.resize(P,(W,int(P.shape[0]*W/P.shape[1])),interpolation=cv2.INTER_AREA)
    cv2.putText(P,'%.2f'%(n/25),(6,24),0,0.8,(0,255,255),2)
    rows.append(P); rows.append(np.full((4,W,3),40,np.uint8))
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88])
