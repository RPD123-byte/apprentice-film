# zgrid.py k x0 y0 x1 y1 scale step out.jpg : zoomed source crop with a labelled grid (labels = frame px)
import sys, cv2
k,x0,y0,x1,y1=map(int,sys.argv[1:6]); sc=float(sys.argv[6]); st=int(sys.argv[7]); out=sys.argv[8]
src=sys.argv[9] if len(sys.argv)>9 else f'src/f{k:03d}.png'
S=cv2.imread(src)[y0:y1,x0:x1]
S=cv2.resize(S,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
for x in range((x0//st+1)*st,x1,st):
    X=int((x-x0)*sc); c=(0,0,255) if x%100==0 else (0,200,255)
    cv2.line(S,(X,0),(X,S.shape[0]),c,1); cv2.putText(S,str(x),(X+2,12),0,0.4,(0,255,0),1)
for y in range((y0//st+1)*st,y1,st):
    Y=int((y-y0)*sc); c=(0,0,255) if y%100==0 else (0,200,255)
    cv2.line(S,(0,Y),(S.shape[1],Y),c,1); cv2.putText(S,str(y),(2,Y-2),0,0.4,(0,255,0),1)
cv2.imwrite(out,S,[cv2.IMWRITE_JPEG_QUALITY,90])
