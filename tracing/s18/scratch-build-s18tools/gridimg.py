import cv2,sys
# usage: gridimg.py in.png out.jpg x0 y0 x1 y1 [scale] [step]
img=cv2.imread(sys.argv[1]); out=sys.argv[2]
x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]
sc=float(sys.argv[7]) if len(sys.argv)>7 else 1
step=int(sys.argv[8]) if len(sys.argv)>8 else 50
H,W=img.shape[:2]; f=img.copy()
for x in range(0,W,step): cv2.line(f,(x,0),(x,H),(0,200,255) if x%500 else (0,0,255),1)
for y in range(0,H,step): cv2.line(f,(0,y),(W,y),(0,200,255) if y%500 else (0,0,255),1)
c=cv2.resize(f[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
for x in range((x0//step+1)*step,x1,step*2): cv2.putText(c,str(x),(int((x-x0)*sc)+2,14),0,0.45,(0,255,0),1)
for y in range((y0//step+1)*step,y1,step*2): cv2.putText(c,str(y),(2,int((y-y0)*sc)-3),0,0.45,(0,255,0),1)
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,90])
