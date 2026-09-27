import cv2,sys
f=cv2.imread(sys.argv[1]); x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; k=int(sys.argv[7]) if len(sys.argv)>7 else 3
c=cv2.resize(f[y0:y1,x0:x1],None,fx=k,fy=k,interpolation=cv2.INTER_CUBIC)
for x in range((x0//10+1)*10,x1,10):
    cv2.line(c,((x-x0)*k,0),((x-x0)*k,c.shape[0]),(0,200,255) if x%50 else (0,0,255),1)
    if x%50==0: cv2.putText(c,str(x),((x-x0)*k+2,12),0,0.4,(0,255,255),1)
for y in range((y0//10+1)*10,y1,10):
    cv2.line(c,(0,(y-y0)*k),(c.shape[1],(y-y0)*k),(0,200,255) if y%50 else (0,0,255),1)
    if y%50==0: cv2.putText(c,str(y),(2,(y-y0)*k-2),0,0.4,(0,255,255),1)
cv2.imwrite(sys.argv[6],c)
