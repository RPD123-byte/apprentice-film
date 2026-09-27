import cv2, numpy as np, glob, sys, re
# blend.py DIR t x0 y0 x1 y1 out.jpg : render (red) / source (cyan) overlay + both side by side, 3x
d,t=sys.argv[1],sys.argv[2]; x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; out=sys.argv[7]
f=[p for p in glob.glob(d+'/frame-*.png') if abs(float(re.search(r'at-([\d.]+)s',p).group(1))-float(t))<1e-3][0]
R=cv2.cvtColor(cv2.imread(f),cv2.COLOR_BGR2GRAY)[y0:y1,x0:x1]; S=cv2.cvtColor(cv2.imread(f.replace('frame-','ref-')),cv2.COLOR_BGR2GRAY)[y0:y1,x0:x1]
ov=np.dstack([S,S,R])
z=3
ov=cv2.resize(ov,None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)
for x in range(x0,x1,10):
    X=(x-x0)*z; cv2.line(ov,(X,0),(X,10 if x%50 else 25),(0,255,255),1)
    if x%50==0: cv2.putText(ov,str(x),(X+2,38),0,0.5,(0,255,255),1)
for y in range(y0,y1,10):
    Y=(y-y0)*z; cv2.line(ov,(0,Y),(10 if y%50 else 25,Y),(0,255,255),1)
    if y%50==0: cv2.putText(ov,str(y),(28,Y+5),0,0.5,(0,255,255),1)
cv2.imwrite(out,ov)
