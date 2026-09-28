# fgrid.py IMG|FRAME out.jpg x0 y0 x1 y1 [scale] [step]  fine grid crop (labels = frame px); FRAME = int -> source frame
import cv2, sys, os
M='/Users/computer/rootline/apprentice-film/snapshots/end-s25-tfix-meas'
src=sys.argv[1]; out=sys.argv[2]; x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]
sc=float(sys.argv[7]) if len(sys.argv)>7 else 3; st=int(sys.argv[8]) if len(sys.argv)>8 else 10
im=cv2.imread(os.path.join(M,f'src_{int(src):05d}.png') if src.isdigit() else src)
c=cv2.resize(im[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
for x in range((x0//st+1)*st,x1,st):
    X=int((x-x0)*sc); big=x%50==0
    cv2.line(c,(X,0),(X,c.shape[0]),(0,0,255) if big else (0,160,255),1 if big else 1, lineType=cv2.LINE_AA) if big else cv2.line(c,(X,0),(X,c.shape[0]),(0,120,200),1)
    if big: cv2.putText(c,str(x),(X+2,12),0,0.4,(0,255,255),1)
for y in range((y0//st+1)*st,y1,st):
    Y=int((y-y0)*sc); big=y%50==0
    cv2.line(c,(0,Y),(c.shape[1],Y),(0,0,255) if big else (0,120,200),1)
    if big: cv2.putText(c,str(y),(2,Y-2),0,0.4,(0,255,255),1)
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,92])
