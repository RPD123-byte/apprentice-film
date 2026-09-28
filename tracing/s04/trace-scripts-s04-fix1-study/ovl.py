# ovl.py DIR idx t x0 y0 x1 y1 out.jpg [scale]: render (grey) with the source's dark-mass outline (red) and edges (green)
import cv2, numpy as np, sys
d,i,t=sys.argv[1],int(sys.argv[2]),sys.argv[3]; x0,y0,x1,y1=[int(v) for v in sys.argv[4:8]]; out=sys.argv[8]; sc=float(sys.argv[9]) if len(sys.argv)>9 else 1
a=cv2.imread(f'{d}/frame-{i:02d}-at-{t}s.png'); b=cv2.imread(f'{d}/ref-{i:02d}-at-{t}s.png')
a=a[y0:y1,x0:x1]; b=b[y0:y1,x0:x1]
g=cv2.cvtColor(b,cv2.COLOR_BGR2GRAY); gb=cv2.GaussianBlur(g,(0,0),3)
dark=(gb<50).astype(np.uint8); cs,_=cv2.findContours(dark,cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE)
o=(cv2.cvtColor(cv2.cvtColor(a,cv2.COLOR_BGR2GRAY),cv2.COLOR_GRAY2BGR)*0.8).astype(np.uint8)
e=cv2.Canny(cv2.GaussianBlur(g,(0,0),1.5),60,140); o[e>0]=(0,200,0)
cv2.drawContours(o,[c for c in cs if cv2.contourArea(c)>300],-1,(0,0,255),2)
for x in range((x0//50)*50,x1,50):
    if x>=x0: cv2.line(o,(x-x0,0),(x-x0,8),(0,255,255),1); cv2.putText(o,str(x),(x-x0+2,20),0,0.35,(0,255,255),1) if x%100==0 else None
for y in range((y0//50)*50,y1,50):
    if y>=y0: cv2.line(o,(0,y-y0),(8,y-y0),(0,255,255),1); cv2.putText(o,str(y),(10,y-y0+4),0,0.35,(0,255,255),1) if y%100==0 else None
if sc!=1: o=cv2.resize(o,None,fx=sc,fy=sc)
cv2.imwrite(out,o,[cv2.IMWRITE_JPEG_QUALITY,90])
