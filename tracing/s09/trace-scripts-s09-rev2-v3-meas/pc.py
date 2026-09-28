# pc.py render.png src.png x0 y0 x1 y1 ... : phase-correlation shift (render relative to source) in regions
import cv2,numpy as np,sys
A=cv2.imread(sys.argv[1],0).astype(np.float32); B=cv2.imread(sys.argv[2],0).astype(np.float32)
v=list(map(int,sys.argv[3:]))
for i in range(0,len(v),4):
    x0,y0,x1,y1=v[i:i+4]
    a=A[y0:y1,x0:x1]; b=B[y0:y1,x0:x1]
    a=cv2.GaussianBlur(a,(0,0),1.5); b=cv2.GaussianBlur(b,(0,0),1.5)
    w=cv2.createHanningWindow((x1-x0,y1-y0),cv2.CV_32F)
    (dx,dy),r=cv2.phaseCorrelate(b,a,w)
    print(f'{x0},{y0},{x1},{y1}: render-src dx={dx:+.2f} dy={dy:+.2f} resp={r:.2f}')
