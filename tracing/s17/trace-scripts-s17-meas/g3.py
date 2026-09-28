import cv2, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
t=float(sys.argv[1]); out=sys.argv[2]; x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; z=int(sys.argv[7]) if len(sys.argv)>7 else 3
c=cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read()
f=cv2.resize(f[y0:y1,x0:x1],None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)
for x in range((x0//20+1)*20,x1,20):
    X=(x-x0)*z; col=(0,0,255) if x%100==0 else (0,160,200)
    cv2.line(f,(X,0),(X,f.shape[0]),col,1)
    if x%100==0 or x%20==0 and z>=4: cv2.putText(f,str(x),(X+2,12),0,0.4,(0,255,255),1)
for y in range((y0//20+1)*20,y1,20):
    Y=(y-y0)*z; col=(0,0,255) if y%100==0 else (0,160,200)
    cv2.line(f,(0,Y),(f.shape[1],Y),col,1)
    cv2.putText(f,str(y),(2,Y-2),0,0.4,(0,255,255),1)
cv2.putText(f,f"{t:.2f}",(f.shape[1]-60,f.shape[0]-8),0,0.6,(0,255,0),2)
cv2.imwrite(out,f,[cv2.IMWRITE_JPEG_QUALITY,90])
