import cv2, glob, re, numpy as np, sys
d=sys.argv[1]; box=[int(v) for v in sys.argv[2:6]] if len(sys.argv)>5 else [1000,360,1300,600]; cols=int(sys.argv[6]) if len(sys.argv)>6 else 3
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
rs=sorted(glob.glob(d+'/ref-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
exec(open('/Users/computer/rootline/apprentice-film/snapshots/s01-fix1-meas/camlib.py').read())
tiles=[]
for f,r in zip(fs,rs):
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    a=plate_frame(t,*box,1,img=cv2.imread(f)); b=plate_frame(t,*box,1,img=cv2.imread(r))
    im=np.hstack([a,np.full((a.shape[0],3,3),(0,0,255),np.uint8),b]); cv2.putText(im,f"{t:.2f}",(4,16),0,0.5,(0,255,255),1); tiles.append(im)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(d+'/crops.jpg',np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]),[cv2.IMWRITE_JPEG_QUALITY,85])
