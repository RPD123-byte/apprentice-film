# fgrid.py T out.jpg x0 y0 x1 y1 [scale] [step] [--render PNG]  source (or a render png) crop, grid every `step` px, labels in frame px
import cv2, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
a=sys.argv; t=float(a[1]); out=a[2]; x0,y0,x1,y1=map(int,a[3:7]); k=float(a[7]) if len(a)>7 and not a[7].startswith('--') else 3; st=int(a[8]) if len(a)>8 and not a[8].startswith('--') else 10
if '--render' in a: f=cv2.imread(a[a.index('--render')+1])
else:
    c=cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read()
f=cv2.resize(f[y0:y1,x0:x1],None,fx=k,fy=k,interpolation=cv2.INTER_CUBIC)
for x in range((x0//st+1)*st,x1,st):
    X=int((x-x0)*k); major=x%(st*5)==0
    cv2.line(f,(X,0),(X,f.shape[0]),(0,0,255) if major else (0,160,220),1)
    if major: cv2.putText(f,str(x),(X+2,12),0,0.4,(0,255,255),1)
for y in range((y0//st+1)*st,y1,st):
    Y=int((y-y0)*k); major=y%(st*5)==0
    cv2.line(f,(0,Y),(f.shape[1],Y),(0,0,255) if major else (0,160,220),1)
    if major: cv2.putText(f,str(y),(2,Y-3),0,0.4,(0,255,255),1)
cv2.imwrite(out,f,[cv2.IMWRITE_JPEG_QUALITY,90])
