# zg.py T x0 y0 x1 y1 Z G out.jpg [render.png]  -> plate-coordinate crop of the SOURCE at T (or of a render png), zoom Z, grid every G plate px
import sys, cv2, numpy as np
exec(open('/Users/computer/rootline/apprentice-film/snapshots/s01-fix1-meas/camlib.py').read())
T=float(sys.argv[1]); x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; Z=float(sys.argv[6]); G=int(sys.argv[7]); out=sys.argv[8]
img=cv2.imread(sys.argv[9]) if len(sys.argv)>9 else None
c=plate_frame(T,x0,y0,x1,y1,Z,img)
for x in range((x0//G+1)*G,x1,G):
    X=int((x-x0)*Z); col=(0,0,255) if x%(G*5)==0 else (0,200,255)
    cv2.line(c,(X,0),(X,c.shape[0]),col,1)
    if x%(G*5)==0: cv2.putText(c,str(x),(X+2,12),0,0.4,(0,255,255),1)
for y in range((y0//G+1)*G,y1,G):
    Y=int((y-y0)*Z); col=(0,0,255) if y%(G*5)==0 else (0,200,255)
    cv2.line(c,(0,Y),(c.shape[1],Y),col,1)
    if y%(G*5)==0: cv2.putText(c,str(y),(2,Y-2),0,0.4,(0,255,255),1)
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,92])
