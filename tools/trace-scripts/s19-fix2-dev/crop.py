# side-by-side crops: python3 crop.py dir x0 y0 x1 y1 [scale] -> dir/crop-T.jpg for each r-T.png, plus a sheet
import cv2,numpy as np,sys,glob,re,os
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
d=sys.argv[1]; x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; k=float(sys.argv[6]) if len(sys.argv)>6 else 1.0
c=cv2.VideoCapture(V); tiles=[]
for p in sorted(glob.glob(d+'/r-*.png'),key=lambda p: float(re.search(r'r-([\d.]+)\.png',p).group(1))):
    t=float(re.search(r'r-([\d.]+)\.png',p).group(1))
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,s=c.read(); r=cv2.imread(p)
    a=r[y0:y1,x0:x1]; b=s[y0:y1,x0:x1]
    im=np.hstack([a,np.zeros((a.shape[0],6,3),np.uint8)+80,b])
    if k!=1: im=cv2.resize(im,None,fx=k,fy=k,interpolation=cv2.INTER_AREA)
    cv2.putText(im,f'{t:.2f}',(6,20),0,0.6,(0,255,0),2)
    tiles.append(im)
cols=int(sys.argv[7]) if len(sys.argv)>7 else 1
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
cv2.imwrite(os.path.join(d,'crops.jpg'),np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88])
print('wrote',len(tiles))
