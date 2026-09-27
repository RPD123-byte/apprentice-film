# Source frame at time T warped back into plate (t=0) coordinates, crop [x0 y0 x1 y1], zoom Z, optional grid step G.
# usage: plate.py T out.jpg x0 y0 x1 y1 [Z] [G]
import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
TR=[l.split() for l in open(__file__.replace('plate.py','track.txt'))]
TR=[(float(a[0]),float(a[1]),float(a[3]),float(a[4])) for a in TR]
def cam(t):
    for i in range(1,len(TR)):
        if t<=TR[i][0]:
            a,b=TR[i-1],TR[i]; u=(t-a[0])/(b[0]-a[0]); return [a[k]+(b[k]-a[k])*u for k in (1,2,3)]
    return TR[-1][1:]
t=float(sys.argv[1]); out=sys.argv[2]; x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]
Z=float(sys.argv[7]) if len(sys.argv)>7 else 2; G=int(sys.argv[8]) if len(sys.argv)>8 else 0
c=cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read()
s,tx,ty=cam(t)
# plate p -> frame s*p+t ; we want output pixel (u,v) = plate (x0+u/Z, y0+v/Z)
M=np.float32([[s/Z,0,s*x0+tx],[0,s/Z,s*y0+ty]])
w,h=int((x1-x0)*Z),int((y1-y0)*Z)
o=cv2.warpAffine(f,M,(w,h),flags=cv2.WARP_INVERSE_MAP|cv2.INTER_CUBIC)
if G:
    for x in range((x0//G+1)*G,x1,G):
        X=int((x-x0)*Z); cv2.line(o,(X,0),(X,h),(0,200,255),1); cv2.putText(o,str(x),(X+2,12),0,0.4,(0,255,255),1)
    for y in range((y0//G+1)*G,y1,G):
        Y=int((y-y0)*Z); cv2.line(o,(0,Y),(w,Y),(0,200,255),1); cv2.putText(o,str(y),(2,Y-2),0,0.4,(0,255,255),1)
cv2.imwrite(out,o,[cv2.IMWRITE_JPEG_QUALITY,92])
