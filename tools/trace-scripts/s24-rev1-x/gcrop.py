# gcrop.py render.png srcidx out.jpg x0 y0 x1 y1 [step] [--w W] : side by side (render | source) crop with grid
import cv2, sys, numpy as np
a=sys.argv[1:]; W=1800
if '--w' in a: i=a.index('--w'); W=int(a[i+1]); del a[i:i+2]
r=cv2.imread(a[0]); s=cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s24-rev1-src/f_%05d.png'%int(a[1]))
x0,y0,x1,y1=map(int,a[3:7]); step=int(a[7]) if len(a)>7 else 100
def grid(im):
    im=im.copy()
    for x in range(0,im.shape[1],step):
        cv2.line(im,(x,0),(x,im.shape[0]),(0,0,255) if x%500==0 else (0,0,150),1)
    for y in range(0,im.shape[0],step):
        cv2.line(im,(0,y),(im.shape[1],y),(0,0,255) if y%500==0 else (0,0,150),1)
    for x in range(0,im.shape[1],step):
        for y in range(0,im.shape[0],step*2):
            cv2.putText(im,'%d,%d'%(x,y),(x+2,y+12),cv2.FONT_HERSHEY_SIMPLEX,0.38,(0,255,255),1)
    return im
rc=grid(r)[y0:y1,x0:x1]; sc=grid(s)[y0:y1,x0:x1]
st=np.hstack([rc,np.full((rc.shape[0],6,3),(0,0,255),np.uint8),sc])
if st.shape[1]!=W: st=cv2.resize(st,(W,int(st.shape[0]*W/st.shape[1])),interpolation=cv2.INTER_AREA)
cv2.imwrite(a[2],st,[cv2.IMWRITE_JPEG_QUALITY,90])
