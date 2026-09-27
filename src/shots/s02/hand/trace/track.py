# chained phase-correlation track of the s02 camera (consecutive frames), full frame, owl masked by a crude box
import cv2, numpy as np, sys, json
S='../s02-r3-src'
def g(f): return cv2.imread(f'{S}/{f:04d}.png',0).astype(np.float32)
win=cv2.createHanningWindow((2206,946),cv2.CV_32F)
acc=[0.0,0.0]; out={151:[0,0]}
prev=g(151)
for f in range(152,478):
    cur=g(f)
    (dx,dy),resp=cv2.phaseCorrelate(prev,cur,win)
    # (dx,dy) = shift of cur relative to prev
    acc=[acc[0]+dx,acc[1]+dy]
    out[f]=[round(acc[0],2),round(acc[1],2),round(dx,2),round(dy,2),round(resp,3)]
    prev=cur
json.dump(out,open('chain_pc.json','w'))
for f in range(252,478,2): print(f, out[f])
