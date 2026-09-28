# g.py k x0 y0 x1 y1 out.jpg [scale] [step] [render.png]  -> source crop (and optional render crop side by side) with frame-px grid
import cv2,sys,numpy as np
SP='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad'
k=int(sys.argv[1]); x0,y0,x1,y1=map(int,sys.argv[2:6]); out=sys.argv[6]
sc=float(sys.argv[7]) if len(sys.argv)>7 else 2; st=int(sys.argv[8]) if len(sys.argv)>8 else 20
ims=[cv2.imread(SP+'/s24src/f%04d.png'%(2420+k))]
if len(sys.argv)>9: ims.append(cv2.imread(sys.argv[9]))
outs=[]
for f in ims:
  c=cv2.resize(f[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
  for x in range((x0//st+1)*st,x1,st):
    X=int((x-x0)*sc); major=x%100==0
    cv2.line(c,(X,0),(X,c.shape[0]),(0,0,255) if major else (0,160,255),1)
    if major or st>=50: cv2.putText(c,str(x),(X+2,12),0,0.4,(0,255,255),1)
  for y in range((y0//st+1)*st,y1,st):
    Y=int((y-y0)*sc); major=y%100==0
    cv2.line(c,(0,Y),(c.shape[1],Y),(0,0,255) if major else (0,160,255),1)
    if major or st>=50: cv2.putText(c,str(y),(2,Y-3),0,0.4,(0,255,255),1)
  outs.append(c)
cv2.imwrite(out,np.hstack(outs) if len(outs)>1 else outs[0],[cv2.IMWRITE_JPEG_QUALITY,90])
