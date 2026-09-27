import cv2,numpy as np,sys
# grid16.py x0 y0 x1 y1 out [scale] [frame]  -> plate (or frame) crop with 50px grid, labels in frame px
x0,y0,x1,y1=[int(v) for v in sys.argv[1:5]]; out=sys.argv[5]; sc=float(sys.argv[6]) if len(sys.argv)>6 else 1
M=90
if len(sys.argv)>7:
    im=cv2.imread(f'../s16-p2-src/f{sys.argv[7]}.png'); pad=np.zeros((946+2*M,2206+2*M,3),np.uint8); pad[M:M+946,M:M+2206]=im; im=pad
else:
    E=np.load('../s16-p2-tools/plateE.npy'); im=cv2.cvtColor((np.clip(E,0,1)*255).astype(np.uint8),cv2.COLOR_GRAY2BGR)
c=im[y0+M:y1+M,x0+M:x1+M].copy()
c=cv2.resize(c,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
ST=int(__import__("os").environ.get("ST","50"))
for x in range((x0//ST)*ST,x1+1,ST):
    if x<x0: continue
    X=int((x-x0)*sc); cv2.line(c,(X,0),(X,c.shape[0]),(0,0,255) if x%100==0 else (0,160,255),1); cv2.putText(c,str(x),(X+2,12),0,0.4,(0,255,255),1)
for y in range((y0//ST)*ST,y1+1,ST):
    if y<y0: continue
    Y=int((y-y0)*sc); cv2.line(c,(0,Y),(c.shape[1],Y),(0,0,255) if y%100==0 else (0,160,255),1); cv2.putText(c,str(y),(2,Y-2),0,0.4,(0,255,255),1)
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,90])
