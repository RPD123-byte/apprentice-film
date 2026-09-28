# stacked render/ref full frames at half res (true alignment). usage: sbs.py DIR idx
import cv2, numpy as np, sys, glob
d,idx=sys.argv[1],sys.argv[2]
fr=glob.glob(f'{d}/frame-{idx}-at-*.png')[0]; rf=fr.replace('/frame-','/ref-')
a=cv2.imread(fr); b=cv2.imread(rf)
im=np.vstack([a,np.zeros((8,a.shape[1],3),np.uint8)+90,b])
im=cv2.resize(im,None,fx=0.5,fy=0.5,interpolation=cv2.INTER_AREA)
cv2.imwrite(f'{d}/sbs-{idx}.jpg',im,[cv2.IMWRITE_JPEG_QUALITY,88]); print(f'{d}/sbs-{idx}.jpg')
