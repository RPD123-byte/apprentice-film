# Tiles of SOURCE crops at given times with a labelled frame-pixel grid.  gridstrip.py "t1,t2,.." x0 y0 x1 y1 out.jpg [step] [cols] [tilew]
import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
ts=[float(v) for v in sys.argv[1].split(',')]; x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; out=sys.argv[6]
step=int(sys.argv[7]) if len(sys.argv)>7 else 50; cols=int(sys.argv[8]) if len(sys.argv)>8 else 3; tw=int(sys.argv[9]) if len(sys.argv)>9 else 660
c=cv2.VideoCapture(V); tiles=[]
for t in ts:
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read(); f=f[y0:y1,x0:x1].copy()
    k=tw/(x1-x0); f=cv2.resize(f,(tw,int((y1-y0)*k)),interpolation=cv2.INTER_AREA)
    for x in range((x0//step+1)*step,x1,step):
        X=int((x-x0)*k); cv2.line(f,(X,0),(X,f.shape[0]),(0,200,255) if x%(step*2) else (0,0,255),1); cv2.putText(f,str(x),(X+2,12),0,0.38,(0,255,255),1)
    for y in range((y0//step+1)*step,y1,step):
        Y=int((y-y0)*k); cv2.line(f,(0,Y),(f.shape[1],Y),(0,200,255) if y%(step*2) else (0,0,255),1); cv2.putText(f,str(y),(2,Y-2),0,0.38,(0,255,255),1)
    cv2.putText(f,f"{t:.2f}",(4,f.shape[0]-6),0,0.6,(0,255,0),2); tiles.append(f)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88]); print(out)
