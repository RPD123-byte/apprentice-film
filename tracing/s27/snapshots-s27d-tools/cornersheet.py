# Gridded crops around the laptop base at key times (for reading the base corners by eye).
import cv2, numpy as np, json, sys
from src import frame
KB={round(r[0],2):np.array(r[1:]).reshape(3,3) for r in json.load(open('../s27d-meas/klt_base.json'))['H']}
C=np.float32([[680,673],[1489,673],[1620,774],[546,774]])
ts=[float(a) for a in sys.argv[2:]]; outp=sys.argv[1]
ims=[]
for t in ts:
    f=frame(t); H=KB[min(KB,key=lambda k:abs(k-t))]
    g=cv2.perspectiveTransform(C[None],H)[0]
    x0=int(max(0,g[:,0].min()-90)); x1=int(min(2206,g[:,0].max()+90)); y0=int(max(0,g[:,1].min()-60)); y1=int(min(946,g[:,1].max()+60))
    c=f[y0:y1,x0:x1]; z=1500/c.shape[1]; c=cv2.resize(c,None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)
    for gx in range((x0//10+1)*10,x1,10):
        X=int((gx-x0)*z); col=(0,0,255) if gx%50==0 else (0,200,255)
        if gx%50==0 or z>2.2: cv2.line(c,(X,0),(X,c.shape[0]),col,1)
        if gx%50==0: cv2.putText(c,str(gx),(X+2,12),0,0.42,(255,255,0),1)
    for gy in range((y0//10+1)*10,y1,10):
        Y=int((gy-y0)*z); col=(0,0,255) if gy%50==0 else (0,200,255)
        if gy%50==0 or z>2.2: cv2.line(c,(0,Y),(c.shape[1],Y),col,1)
        if gy%50==0: cv2.putText(c,str(gy),(2,Y-2),0,0.42,(255,255,0),1)
    cv2.putText(c,f"{t:.2f}",(c.shape[1]-90,c.shape[0]-10),0,0.8,(0,255,0),2)
    ims.append(c)
w=max(i.shape[1] for i in ims)
ims=[np.pad(i,((0,4),(0,w-i.shape[1]),(0,0))) for i in ims]
cv2.imwrite(outp,np.vstack(ims),[cv2.IMWRITE_JPEG_QUALITY,88])
