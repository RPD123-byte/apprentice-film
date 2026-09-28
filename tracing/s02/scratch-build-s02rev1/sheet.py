# sheet.py dir out start_idx count [width]: stack pair images vertically, labelled
import cv2, glob, re, sys, numpy as np
d,out,s,n=sys.argv[1],sys.argv[2],int(sys.argv[3]),int(sys.argv[4]); w=int(sys.argv[5]) if len(sys.argv)>5 else 1400
fs=sorted(glob.glob(d+'/pair-*.jpg'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))[s:s+n]
ims=[]
for p in fs:
    im=cv2.imread(p); im=cv2.resize(im,(w,int(im.shape[0]*w/im.shape[1])),interpolation=cv2.INTER_AREA)
    t=re.search(r'at-([\d.]+)s',p).group(1)
    cv2.putText(im,t,(w//2-60,28),cv2.FONT_HERSHEY_SIMPLEX,0.9,(0,255,255),2)
    ims.append(im)
cv2.imwrite(out,np.vstack(ims),[cv2.IMWRITE_JPEG_QUALITY,88])
