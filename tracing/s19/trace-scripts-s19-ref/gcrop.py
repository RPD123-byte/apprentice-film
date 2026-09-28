# tiles of source crops over time with a frame-coordinate grid every 50 px (labels every 100)
import cv2,numpy as np,sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
out=sys.argv[1]; ts=[float(x) for x in sys.argv[2].split(',')]; x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; k=float(sys.argv[7]); cols=int(sys.argv[8])
c=cv2.VideoCapture(V); tiles=[]
for t in ts:
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read()
    f=f[y0:y1,x0:x1].copy()
    f=cv2.resize(f,None,fx=k,fy=k,interpolation=cv2.INTER_AREA)
    for x in range((x0//50+1)*50,x1,50):
        X=int((x-x0)*k); cv2.line(f,(X,0),(X,f.shape[0]),(0,0,255) if x%100==0 else (0,140,255),1)
        if x%100==0: cv2.putText(f,str(x),(X+2,24),0,0.4,(0,255,255),1)
    for y in range((y0//50+1)*50,y1,50):
        Y=int((y-y0)*k); cv2.line(f,(0,Y),(f.shape[1],Y),(0,0,255) if y%100==0 else (0,140,255),1)
        if y%100==0: cv2.putText(f,str(y),(2,Y-2),0,0.4,(0,255,255),1)
    cv2.putText(f,f'{t:.2f}',(4,12),0,0.45,(0,255,0),1)
    tiles.append(f)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]),[cv2.IMWRITE_JPEG_QUALITY,88])
