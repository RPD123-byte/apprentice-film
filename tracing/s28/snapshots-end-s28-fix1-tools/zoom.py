# zoom.py out.jpg x0,y0,x1,y1 scale n1,n2,.. dirA [dirB ...]   (each row: frame n; columns: dirs..., source) with grid
import cv2, numpy as np, sys
SP='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad'
out=sys.argv[1]; x0,y0,x1,y1=[int(v) for v in sys.argv[2].split(',')]; sc=float(sys.argv[3]); ns=[int(v) for v in sys.argv[4].split(',')]
dirs=sys.argv[5:]+[SP+'/src']
grid='--nogrid' not in sys.argv
dirs=[d for d in dirs if d!='--nogrid']
rows=[]
step=max(10,int(round(40/sc/10))*10)
for n in ns:
    tl=[]
    for d in dirs:
        im=cv2.imread(f'{d}/{n}.png')
        if im is None: im=np.zeros((946,2206,3),np.uint8)
        c=cv2.resize(im[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_LINEAR)
        if grid:
            for x in range((x0//step+1)*step,x1,step): X=int((x-x0)*sc); cv2.line(c,(X,0),(X,c.shape[0]),(0,0,200),1); cv2.putText(c,str(x),(X+2,12),0,0.35,(0,0,255),1)
            for y in range((y0//step+1)*step,y1,step): Y=int((y-y0)*sc); cv2.line(c,(0,Y),(c.shape[1],Y),(0,0,200),1); cv2.putText(c,str(y),(2,Y-2),0,0.35,(0,0,255),1)
        lab=('src' if d.endswith('/src') else d.rstrip('/').split('/')[-1])+f' {n/25:.2f}'
        cv2.putText(c,lab,(6,c.shape[0]-8),0,0.6,(0,0,0),3); cv2.putText(c,lab,(6,c.shape[0]-8),0,0.6,(0,255,255),1)
        tl.append(c); tl.append(np.full((c.shape[0],4,3),255,np.uint8))
    rows.append(np.hstack(tl[:-1])); rows.append(np.full((4,rows[-1].shape[1],3),255,np.uint8))
cv2.imwrite(out,np.vstack(rows[:-1]),[cv2.IMWRITE_JPEG_QUALITY,90])
