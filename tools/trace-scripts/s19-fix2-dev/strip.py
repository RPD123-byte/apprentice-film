# tile render/source crops for every r-*.png in dir: python3 strip.py dir x0 y0 x1 y1 scale cols
import cv2,numpy as np,sys,glob,re,os
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
d=sys.argv[1]; x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; k=float(sys.argv[6]); cols=int(sys.argv[7])
c=cv2.VideoCapture(V); tiles=[]
for p in sorted(glob.glob(d+'/r-*.png'),key=lambda p: float(re.search(r'r-(\d+\.\d+)',p).group(1))):
    t=float(re.search(r'r-(\d+\.\d+)',p).group(1))
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,s=c.read(); r=cv2.imread(p)
    a=cv2.resize(r[y0:y1,x0:x1],None,fx=k,fy=k,interpolation=cv2.INTER_AREA); b=cv2.resize(s[y0:y1,x0:x1],None,fx=k,fy=k,interpolation=cv2.INTER_AREA)
    cv2.putText(a,f'R{t:.2f}',(3,14),0,0.45,(0,255,0),1); cv2.putText(b,f'S{t:.2f}',(3,14),0,0.45,(0,255,255),1)
    tiles.append(np.vstack([a,b,np.zeros((4,a.shape[1],3),np.uint8)]))
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(os.path.join(d,'strip.jpg'),np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]),[cv2.IMWRITE_JPEG_QUALITY,85])
