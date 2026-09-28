# ov.py F out.jpg [quadfile] : draw quads over the source frame with a 100px grid
import sys,cv2,numpy as np
sys.path.insert(0,'h'); from common import frame
f=int(sys.argv[1]); out=sys.argv[2]; qf=sys.argv[3] if len(sys.argv)>3 else f'roto/{f}.txt'
im=frame(f).copy()
for x in range(0,2206,100): cv2.line(im,(x,0),(x,946),(0,90,0),1); cv2.putText(im,str(x),(x+2,12),0,0.35,(0,200,0),1)
for y in range(0,946,100): cv2.line(im,(0,y),(2206,y),(0,90,0),1); cv2.putText(im,str(y),(2,y+12),0,0.35,(0,200,0),1)
cols=[(0,0,255),(255,0,0),(0,255,255),(255,0,255),(0,255,0),(255,255,0)]
for i,ln in enumerate(open(qf)):
    t=ln.split();
    if not t: continue
    q=np.array([float(v) for v in t[1:9]]).reshape(4,2).astype(np.int32)
    c=cols[i%len(cols)]; cv2.polylines(im,[q],True,c,2); m=q.mean(0).astype(int); m=np.clip(m,[10,20],[2150,930])
    cv2.putText(im,t[0],tuple(int(v) for v in m),0,0.7,c,2)
cv2.imwrite(out,cv2.resize(im,(1600,686)),[cv2.IMWRITE_JPEG_QUALITY,85])
