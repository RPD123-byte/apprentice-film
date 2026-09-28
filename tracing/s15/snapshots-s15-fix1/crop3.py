# crop3.py OUT.jpg f x0 y0 x1 y1 dirA [dirB ...] : crops of renders (r<f>.png) + source, stacked horizontally
import sys,cv2,numpy as np
sys.path.insert(0,'h'); from common import frame
out=sys.argv[1]; f=int(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); dirs=sys.argv[7:]
ims=[cv2.imread(f'{d}/r{f}.png')[y0:y1,x0:x1] for d in dirs]+[frame(f)[y0:y1,x0:x1]]
for im,l in zip(ims,dirs+['source']): cv2.putText(im,l,(6,20),0,0.6,(0,255,255),2)
row=np.hstack(ims)
if row.shape[1]>2400: row=cv2.resize(row,(2400,int(row.shape[0]*2400/row.shape[1])),interpolation=cv2.INTER_AREA)
cv2.imwrite(out,row,[cv2.IMWRITE_JPEG_QUALITY,88])
