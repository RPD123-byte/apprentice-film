import cv2, glob, sys, numpy as np, re
d=sys.argv[1]; cols=int(sys.argv[2]) if len(sys.argv)>2 else 2; w=int(sys.argv[3]) if len(sys.argv)>3 else 900
fs=sorted(glob.glob(d+'/pair-*.jpg'))
ims=[]
for p in fs:
    im=cv2.imread(p); f=int(re.search(r'pair-(\d+)',p).group(1))
    im=cv2.resize(im,(w,int(w*im.shape[0]/im.shape[1]))); cv2.putText(im,f'{f} {f/25:.2f}',(6,20),0,0.6,(0,255,255),2); ims.append(im)
while len(ims)%cols: ims.append(np.zeros_like(ims[0]))
sh=np.vstack([np.hstack(ims[i:i+cols]) for i in range(0,len(ims),cols)])
cv2.imwrite(d+'/sheet.jpg',sh,[cv2.IMWRITE_JPEG_QUALITY,80]); print(sh.shape)
