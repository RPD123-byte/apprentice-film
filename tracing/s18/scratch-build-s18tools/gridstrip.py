import cv2,sys,numpy as np
# usage: gridstrip.py T0 T1 STEP out.jpg scale cols [x0 y0 x1 y1]
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
t0,t1,st=float(sys.argv[1]),float(sys.argv[2]),float(sys.argv[3]); out=sys.argv[4]; sc=float(sys.argv[5]); cols=int(sys.argv[6])
roi=[int(v) for v in sys.argv[7:11]] if len(sys.argv)>=11 else [0,0,2206,946]
c=cv2.VideoCapture(V); tiles=[]; t=t0
while t<=t1+1e-6:
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read()
    H,W=f.shape[:2]
    for x in range(0,W,100): cv2.line(f,(x,0),(x,H),(0,200,255) if x%500 else (0,0,255),1)
    for y in range(0,H,100): cv2.line(f,(0,y),(W,y),(0,200,255) if y%500 else (0,0,255),1)
    x0,y0,x1,y1=roi
    f=cv2.resize(f[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
    for x in range((x0//100+1)*100,x1,100): cv2.putText(f,str(x),(int((x-x0)*sc)+2,12),0,0.4,(0,255,0),1)
    for y in range((y0//100+1)*100,y1,100): cv2.putText(f,str(y),(2,int((y-y0)*sc)-2),0,0.4,(0,255,0),1)
    cv2.putText(f,f'{t:.2f}',(4,f.shape[0]-6),0,0.6,(0,255,255),2)
    tiles.append(f); t+=st
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88]); print(out,len(tiles))
