# class mismatch map between a render frame and the source at the same time (designer region): black / skin / green
import cv2, numpy as np, sys, re
from src import frame
f=sys.argv[1]; t=float(re.search(r'at-([\d.]+?)s?\.png',f).group(1)); out=sys.argv[2]
R=cv2.imread(f); S=frame(t)
def cls(im):
    b=cv2.GaussianBlur(im,(0,0),1.5); lab=cv2.cvtColor(b,cv2.COLOR_BGR2Lab).astype(int); L,A,B=lab[...,0],lab[...,1]-128,lab[...,2]-128
    c=np.zeros(L.shape,np.uint8)
    c[(A<-1)&(B>1)&(L>60)]=1      # green
    c[(A>7)&(L>140)]=2            # skin
    c[L<60]=3                     # black
    return c
cr,cs=cls(R),cls(S)
x0,y0,x1,y1=0,40,1110,946
vis=np.zeros((y1-y0,x1-x0,3),np.uint8)
col={1:(0,160,0),2:(120,150,230),3:(40,40,40),0:(200,200,200)}
for k,v in col.items(): vis[cs[y0:y1,x0:x1]==k]=v
# red = black in source but not in render, blue = black in render but not source, magenta = skin in render where source is not skin
m1=(cs==3)&(cr!=3); m2=(cr==3)&(cs!=3); m3=(cr==2)&(cs!=2); m4=(cs==2)&(cr!=2)
for m,c in [(m1,(0,0,255)),(m2,(255,0,0)),(m3,(255,0,255)),(m4,(0,255,255))]:
    vis[m[y0:y1,x0:x1]]=c
for gx in range(0,x1,100): cv2.line(vis,(gx,0),(gx,y1-y0),(255,255,255),1); cv2.putText(vis,str(gx),(gx+2,12),0,0.4,(255,255,255),1)
for gy in range(100,y1,100): cv2.line(vis,(0,gy-y0),(x1,gy-y0),(255,255,255),1); cv2.putText(vis,str(gy),(2,gy-y0-2),0,0.4,(255,255,255),1)
cv2.imwrite(out,vis)
print('missing black',m1.sum(),'extra black',m2.sum(),'extra skin',m3.sum(),'missing skin',m4.sum())
