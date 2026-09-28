import cv2, sys
f=cv2.imread(sys.argv[1]); out=sys.argv[2]
x0,y0,x1,y1,z=[int(v) for v in sys.argv[3:8]]
c=f[y0:y1,x0:x1]; c=cv2.resize(c,None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)
for x in range(x0-x0%10+10,x1,10):
    col=(0,0,255) if x%50==0 else (0,140,255); th=1
    cv2.line(c,((x-x0)*z,0),((x-x0)*z,c.shape[0]),col,th)
    if x%50==0: cv2.putText(c,str(x),((x-x0)*z+2,12),0,0.45,(0,255,255),1)
for y in range(y0-y0%10+10,y1,10):
    col=(0,0,255) if y%50==0 else (0,140,255)
    cv2.line(c,(0,(y-y0)*z),(c.shape[1],(y-y0)*z),col,1)
    if y%50==0: cv2.putText(c,str(y),(2,(y-y0)*z-2),0,0.45,(0,255,255),1)
cv2.imwrite(out,c)
