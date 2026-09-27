# Warp a close-up frame into card-local coords: card top-left (1450,182) at t0, card width 465 frame px -> out scale K per t0-px
import cv2, numpy as np, re, sys
exec(open('snapshots/s08-ref/pageref.py').read().split('t=float(sys.argv[1])')[0])
t=float(sys.argv[1]); K=float(sys.argv[2]); out=sys.argv[3]; grid=len(sys.argv)>4
c=cv2.VideoCapture(V); c.set(1,int(round(t*25))); ok,f=c.read()
s,tx,ty=cam[round(t,2)]
Ft=np.array([[s,0,tx],[0,s,ty],[0,0,1]])
O=np.array([[1/K,0,1450-60],[0,1/K,182-40],[0,0,1]])  # out px -> t0 frame px (with margin)
M=Ft@O
w,h=int((465+120)*K),int((648+80)*K)
r=cv2.warpPerspective(f,M,(w,h),flags=cv2.INTER_CUBIC|cv2.WARP_INVERSE_MAP)
if grid:
    for gx in range(0,466+60,25):
        X=int((gx+60)*K); cv2.line(r,(X,0),(X,h),(0,200,255) if gx%100 else (0,60,255),1)
        if gx%50==0: cv2.putText(r,str(gx),(X+2,12),0,0.4,(0,255,255),1)
    for gy in range(0,700,25):
        Y=int((gy+40)*K); cv2.line(r,(0,Y),(w,Y),(0,200,255) if gy%100 else (0,60,255),1)
        if gy%50==0: cv2.putText(r,str(gy),(2,Y-2),0,0.4,(0,255,255),1)
cv2.imwrite(out,r)
