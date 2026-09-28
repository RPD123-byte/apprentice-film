# gridz.py frame out.jpg x0 y0 x1 y1 [scale] [step] [--r RDIR]  -> zoomed crop with labelled grid (frame px)
import cv2, sys
a=sys.argv[1:]; rd=None
if '--r' in a: i=a.index('--r'); rd=a[i+1]; a=a[:i]+a[i+2:]
f=int(a[0]); out=a[1]; x0,y0,x1,y1=map(int,a[2:6]); sc=float(a[6]) if len(a)>6 else 2; st=int(a[7]) if len(a)>7 else 20
im=cv2.imread(f'{rd}/r-{f:05d}.png' if rd else f'src/f{f:05d}.png')[y0:y1,x0:x1]
im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
for x in range((x0//st+1)*st,x1,st):
    X=int((x-x0)*sc); big=x%100==0
    cv2.line(im,(X,0),(X,im.shape[0]),(0,0,255) if big else (0,160,255),1)
    if x%(st*2)==0 or big: cv2.putText(im,str(x),(X+2,12),0,0.4,(0,255,255),1)
for y in range((y0//st+1)*st,y1,st):
    Y=int((y-y0)*sc); big=y%100==0
    cv2.line(im,(0,Y),(im.shape[1],Y),(0,0,255) if big else (0,160,255),1)
    if y%(st*2)==0 or big: cv2.putText(im,str(y),(2,Y-2),0,0.4,(0,255,255),1)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,90])
