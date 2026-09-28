# blend.py dir T x0 y0 x1 y1 [scale]: 50/50 overlay of render and source, plus edges of source in red
import cv2,numpy as np,sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
d,t=sys.argv[1],float(sys.argv[2]); x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; k=float(sys.argv[7]) if len(sys.argv)>7 else 1
c=cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,s=c.read()
r=cv2.imread(f'{d}/r-{t:.2f}.png')
a=r[y0:y1,x0:x1].astype(float); b=s[y0:y1,x0:x1].astype(float)
gs=cv2.cvtColor(s[y0:y1,x0:x1],cv2.COLOR_BGR2GRAY); gr=cv2.cvtColor(r[y0:y1,x0:x1],cv2.COLOR_BGR2GRAY)
es=cv2.Canny(cv2.GaussianBlur(gs,(5,5),0),40,100); er=cv2.Canny(cv2.GaussianBlur(gr,(5,5),0),40,100)
out=(0.5*a+0.5*b)*0.6
out[es>0]=(0,0,255); out[er>0]=(0,255,0)
out=cv2.resize(out.astype(np.uint8),None,fx=k,fy=k)
cv2.imwrite(f'{d}/blend-{t:.2f}.jpg',out)
