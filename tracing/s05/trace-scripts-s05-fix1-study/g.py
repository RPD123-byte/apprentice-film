import cv2, sys
def grid(src,x0,y0,x1,y1,f,name,step=10):
    im=cv2.imread(src)
    c=cv2.resize(im[y0:y1,x0:x1],None,fx=f,fy=f,interpolation=cv2.INTER_CUBIC)
    for x in range((x0//step+1)*step,x1,step):
        X=int((x-x0)*f); col=(0,0,255) if x%50==0 else (0,120,0)
        cv2.line(c,(X,0),(X,c.shape[0]),col,1)
        if x%50==0: cv2.putText(c,str(x),(X+2,12),cv2.FONT_HERSHEY_SIMPLEX,0.4,(0,0,255),1)
    for y in range((y0//step+1)*step,y1,step):
        Y=int((y-y0)*f); col=(0,0,255) if y%50==0 else (0,120,0)
        cv2.line(c,(0,Y),(c.shape[1],Y),col,1)
        if y%50==0: cv2.putText(c,str(y),(2,Y-2),cv2.FONT_HERSHEY_SIMPLEX,0.4,(0,0,255),1)
    cv2.imwrite(name,c)
a=sys.argv
grid(a[1],int(a[2]),int(a[3]),int(a[4]),int(a[5]),float(a[6]),a[7],int(a[8]) if len(a)>8 else 10)
