# zg2.py T x0 y0 x1 y1 Z G out.jpg [render.png] : like zg.py but contrast-stretched grey + labels on every G*2 line
import sys, cv2, numpy as np
exec(open('/Users/computer/rootline/apprentice-film/snapshots/s01-fix1-meas/camlib.py').read())
T=float(sys.argv[1]); x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; Z=float(sys.argv[6]); G=int(sys.argv[7]); out=sys.argv[8]
img=cv2.imread(sys.argv[9]) if len(sys.argv)>9 else None
c=cv2.cvtColor(plate_frame(T,x0,y0,x1,y1,Z,img),cv2.COLOR_BGR2GRAY).astype(float)
lo,hi=np.percentile(c,2),np.percentile(c,98); c=np.clip((c-lo)/(hi-lo+1e-6)*255,0,255).astype(np.uint8)
c=cv2.cvtColor(c,cv2.COLOR_GRAY2BGR)
for x in range((x0//G+1)*G,x1,G):
    X=int((x-x0)*Z); col=(0,0,255) if x%(G*2)==0 else (0,180,255)
    cv2.line(c,(X,0),(X,c.shape[0]),col,1)
    if x%(G*2)==0: cv2.putText(c,str(x),(X+2,12),0,0.38,(255,0,200),1)
for y in range((y0//G+1)*G,y1,G):
    Y=int((y-y0)*Z); col=(0,0,255) if y%(G*2)==0 else (0,180,255)
    cv2.line(c,(0,Y),(c.shape[1],Y),col,1)
    if y%(G*2)==0: cv2.putText(c,str(y),(2,Y-2),0,0.38,(255,0,200),1)
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,92])
