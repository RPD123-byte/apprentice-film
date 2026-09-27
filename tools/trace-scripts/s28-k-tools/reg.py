# registration view: dark ink of the render in red, of the source in green (yellow where they agree)
import sys,glob,cv2,numpy as np
d,t=sys.argv[1],float(sys.argv[2]); box=[int(v) for v in sys.argv[3:7]] if len(sys.argv)>6 else [0,0,2206,946]
c=cv2.VideoCapture('/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4');c.set(1,round(t*25));ok,r=c.read()
fs=[f for f in glob.glob(d+'/frame-*.png') if abs(float(f.split('-at-')[1][:-5])-t)<1e-6]
a=cv2.imread(fs[0])
def ink(im):
    g=cv2.GaussianBlur(cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.2)
    bg=cv2.GaussianBlur(cv2.dilate(g,np.ones((9,9))),(0,0),3)
    return np.clip((bg-g-12)*6,0,255).astype(np.uint8)
x0,y0,x1,y1=box
A=ink(a)[y0:y1,x0:x1]; B=ink(r)[y0:y1,x0:x1]
v=np.zeros((y1-y0,x1-x0,3),np.uint8); v[...,2]=A; v[...,1]=B
out=sys.argv[7] if len(sys.argv)>7 else d+f'/reg-{t:.2f}.jpg'
sc=min(1.0,1800/(x1-x0))
cv2.imwrite(out,cv2.resize(v,None,fx=sc,fy=sc))
