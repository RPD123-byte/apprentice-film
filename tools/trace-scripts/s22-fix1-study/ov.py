# ov.py DIR t x0,y0,x1,y1 out.jpg [k] — render | source | overlay (source grey, render mask outline red, source mask green)
import cv2, numpy as np, glob, sys, re
d,t,box,out=sys.argv[1:5]; k=float(sys.argv[5]) if len(sys.argv)>5 else 3
x0,y0,x1,y1=[int(v) for v in box.split(',')]
f=[p for p in glob.glob(d+'/frame-*.png') if re.search(r'-at-'+re.escape(t)+r's\.png$',p)][0]
r=[p for p in glob.glob(d+'/ref-*.png') if re.search(r'-at-'+re.escape(t)+r's\.png$',p)][0]
A=cv2.imread(f)[y0:y1,x0:x1]; B=cv2.imread(r)[y0:y1,x0:x1]
def mask(im):
    g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY); m=(g>150).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8)); return m
ma,mb=mask(A),mask(B)
up=lambda im: cv2.resize(im,None,fx=k,fy=k,interpolation=cv2.INTER_CUBIC)
O=cv2.cvtColor(cv2.cvtColor(B,cv2.COLOR_BGR2GRAY),cv2.COLOR_GRAY2BGR)
O=up(O)
ca,_=cv2.findContours(up(ma),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
cb,_=cv2.findContours(up(mb),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
cv2.drawContours(O,cb,-1,(0,255,0),1); cv2.drawContours(O,ca,-1,(0,0,255),1)
# grid every 10 px
for X in range((x0//10+1)*10,x1,10):
    for im in (O,):
        cv2.line(im,(int((X-x0)*k),0),(int((X-x0)*k),6),(0,255,255),1)
        if X%50==0: cv2.putText(im,str(X),(int((X-x0)*k)+1,16),0,0.35,(0,255,255),1)
for Y in range((y0//10+1)*10,y1,10):
    cv2.line(O,(0,int((Y-y0)*k)),(6,int((Y-y0)*k)),(0,255,255),1)
    if Y%50==0: cv2.putText(O,str(Y),(8,int((Y-y0)*k)+4),0,0.35,(0,255,255),1)
inter=(ma&mb).sum(); uni=(ma|mb).sum()
print(t,'IoU %.3f'%(inter/max(1,uni)),'area r/s',ma.sum(),mb.sum())
top=np.hstack([up(A),up(B)])
cv2.imwrite(out,np.vstack([top,np.hstack([O,np.zeros_like(O)])]),[cv2.IMWRITE_JPEG_QUALITY,90])
