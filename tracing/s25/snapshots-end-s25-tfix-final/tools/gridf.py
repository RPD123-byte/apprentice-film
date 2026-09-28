# gridf.py F out.jpg scale [x0 y0 x1 y1] : source frame F with a 50 px grid, labelled every 100 (frame px)
import cv2, sys
M='/Users/computer/rootline/apprentice-film/snapshots/end-s25-tfix-meas'
f=int(sys.argv[1]); out=sys.argv[2]; sc=float(sys.argv[3]); roi=[int(v) for v in sys.argv[4:8]] if len(sys.argv)>=8 else [0,0,2206,946]
im=cv2.imread(sys.argv[9]) if len(sys.argv)>9 else cv2.imread(f'{M}/src_{f:05d}.png')
x0,y0,x1,y1=roi; c=cv2.resize(im[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
for x in range((x0//50+1)*50,x1,50):
    X=int((x-x0)*sc); cv2.line(c,(X,0),(X,c.shape[0]),(0,0,255) if x%100==0 else (0,140,255),1)
    if x%100==0: cv2.putText(c,str(x),(X+2,12),0,0.4,(0,255,255),1)
for y in range((y0//50+1)*50,y1,50):
    Y=int((y-y0)*sc); cv2.line(c,(0,Y),(c.shape[1],Y),(0,0,255) if y%100==0 else (0,140,255),1)
    if y%100==0: cv2.putText(c,str(y),(2,Y-2),0,0.4,(0,255,255),1)
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,90])
