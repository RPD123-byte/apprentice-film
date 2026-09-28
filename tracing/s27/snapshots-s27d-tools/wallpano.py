# Measurement aid: warp source frames back into the wall's reference coordinates (held view, 119.6) through the
# measured wall homography, to see where every wall element sits in ref coords. Scratch image only.
import cv2, json, numpy as np, sys
from src import frame
J=json.load(open('../s27d-meas/bg_full.json'))
Hs={round(r[0],2):np.array(r[1:]).reshape(3,3) for r in J['H']}
X0,Y0,X1,Y1=-1000,-220,2700,720
T=np.array([[1,0,-X0],[0,1,-Y0],[0,0,1.]])
ts=[float(a) for a in sys.argv[2:]]
out=np.zeros((Y1-Y0,X1-X0,3),np.uint8)
for t in ts:
    H=Hs[min(Hs,key=lambda k:abs(k-t))]
    M=T@np.linalg.inv(H)
    w=cv2.warpPerspective(frame(t),M,(X1-X0,Y1-Y0))
    m=cv2.warpPerspective(np.full((946,2206),255,np.uint8),M,(X1-X0,Y1-Y0))>0
    out[m]=w[m]
for x in range(X0,X1,50):
    X=x-X0; cv2.line(out,(X,0),(X,out.shape[0]),(0,0,255) if x%100==0 else (0,160,255),1)
    if x%100==0: cv2.putText(out,str(x),(X+2,14),0,0.45,(255,255,0),1)
for y in range(-200,Y1,50):
    Y=y-Y0; cv2.line(out,(0,Y),(out.shape[1],Y),(0,0,255) if y%100==0 else (0,160,255),1)
    if y%100==0: cv2.putText(out,str(y),(2,Y-3),0,0.45,(255,255,0),1)
cv2.imwrite(sys.argv[1],out,[cv2.IMWRITE_JPEG_QUALITY,85])
