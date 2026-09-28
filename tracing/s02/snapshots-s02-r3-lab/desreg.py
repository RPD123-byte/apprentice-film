# offset of the source's designer vs the render's designer in pan frames: phase correlation on the face region
import sys, os, json, cv2, numpy as np
os.environ['ENTRY']='entry_des.js'; fr=sys.argv[1]; sys.argv=[sys.argv[0]]
from run import Lab, parse
sys.path.insert(0,'../s02-r3-meas'); from common import src
cam=json.load(open('../s02-r3-meas/oldcam.json'))
L=Lab()
for f in parse(fr):
    img,_=L.frame(f,False); R=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY).astype(np.float32); S=src(f).astype(np.float32)
    c=cam.get(str(f),[0,0])
    # face region: world x 760..1340, y 180..460 -> frame
    x0,y0,x1,y1=int(760+c[0]),int(180+c[1]),int(1340+c[0]),int(460+c[1])
    x0,y0,x1,y1=max(0,x0),max(0,y0),min(2206,x1),min(946,y1)
    if x1-x0<200 or y1-y0<120: print(f,'-'); continue
    a=cv2.GaussianBlur(R[y0:y1,x0:x1],(0,0),2); b=cv2.GaussianBlur(S[y0:y1,x0:x1],(0,0),2)
    win=cv2.createHanningWindow((x1-x0,y1-y0),cv2.CV_32F)
    (dx,dy),resp=cv2.phaseCorrelate(a,b,win)
    print(f,'src-render shift', round(dx,1), round(dy,1), 'resp', round(resp,3), flush=True)
L.close()
