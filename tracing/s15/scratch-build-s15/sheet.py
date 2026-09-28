import cv2, numpy as np, sys, os
# usage: sheet.py out.jpg cols width  item...   item = path[:label]  or  src:T (source frame at time T)
SRC=os.path.dirname(os.path.abspath(__file__))+'/src'
out, cols, w = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
ims=[]
for it in sys.argv[4:]:
    crop=None
    if '@' in it: it, c = it.split('@'); crop=[int(v) for v in c.split(',')]
    if it.startswith('src:'):
        t=float(it[4:]); p=SRC+'/f%04d.png'%round(t*25); lab='S %.2f'%t
    else:
        p=it; lab=os.path.basename(it)[:30]
    im=cv2.imread(p)
    if im is None: im=np.zeros((946,2206,3),np.uint8)
    if crop: im=im[crop[1]:crop[3],crop[0]:crop[2]]
    h=int(im.shape[0]*w/im.shape[1]); im=cv2.resize(im,(w,h),interpolation=cv2.INTER_AREA)
    cv2.putText(im,lab,(6,22),cv2.FONT_HERSHEY_SIMPLEX,0.6,(0,0,255),2)
    ims.append(im)
H=max(i.shape[0] for i in ims)
ims=[np.pad(i,((0,H-i.shape[0]),(0,0),(0,0))) for i in ims]
while len(ims)%cols: ims.append(np.zeros_like(ims[0]))
rows=[np.hstack(ims[i:i+cols]) for i in range(0,len(ims),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,85])
