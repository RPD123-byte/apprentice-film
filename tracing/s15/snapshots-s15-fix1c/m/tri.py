# tri.py OUT F x0 y0 x1 y1 [dirs...]: crops of renders (r<F>.png in each dir) + the source, stacked vertically
import sys,cv2,numpy as np
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s15-p4/tools')
from common import frame
out=sys.argv[1]; f=int(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); dirs=sys.argv[7:]
ims=[]
for d in dirs:
    p=f'{d}/r{f}.png'; im=cv2.imread(p)
    if im is None: continue
    c=im[y0:y1,x0:x1].copy(); cv2.putText(c,d.split('/')[-1],(4,16),0,0.5,(0,255,255),1); ims.append(c)
c=frame(f)[y0:y1,x0:x1].copy(); cv2.putText(c,'SRC',(4,16),0,0.5,(0,255,255),1); ims.append(c)
horiz=(x1-x0)<(y1-y0)*1.3
cv2.imwrite(out,np.hstack(ims) if horiz else np.vstack(ims),[cv2.IMWRITE_JPEG_QUALITY,90])
