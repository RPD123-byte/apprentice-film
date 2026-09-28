# lvl.py NAME x0 y0 x1 y1 scale [sigma]: level maps (pre-grade, blurred) of our raw render | the source plate, rulers every 25 px
import cv2, sys, numpy as np
nm=sys.argv[1]; x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; S=float(sys.argv[6]); sg=float(sys.argv[7]) if len(sys.argv)>7 else 3
r=cv2.imread(f'../f1-p3/{nm}_raw.png',0).astype(np.float32)/255; u=cv2.imread('../f1-p3/clean_u.png',0).astype(np.float32)/255
def lv(a):
    b=cv2.GaussianBlur(a,(0,0),sg)[y0:y1,x0:x1]; l=(np.digitize(b,[0.15,0.3,0.45,0.6,0.75])*50).astype(np.uint8)
    l=cv2.resize(l,None,fx=S,fy=S,interpolation=cv2.INTER_NEAREST)
    for x in range((x0//25+1)*25,x1,25): cv2.putText(l,str(x),(int((x-x0)*S),12),0,0.35,160,1); cv2.line(l,(int((x-x0)*S),14),(int((x-x0)*S),20),200,1)
    for y in range((y0//25+1)*25,y1,25): cv2.putText(l,str(y),(0,int((y-y0)*S)+4),0,0.35,160,1); cv2.line(l,(22,int((y-y0)*S)),(28,int((y-y0)*S)),200,1)
    return l
a,b=lv(r),lv(u)
sep=np.full((a.shape[0],4),255,np.uint8)
cv2.imwrite(f'../f1-p3/{nm}_lvl_{x0}_{y0}.png',np.hstack([a,sep,b]))
