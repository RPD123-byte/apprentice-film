import cv2, numpy as np, sys
n0,n1,step=int(sys.argv[1]),int(sys.argv[2]),int(sys.argv[3]); x0,y0,x1,y1=map(int,sys.argv[4:8]); out=sys.argv[8]; sc=float(sys.argv[9]) if len(sys.argv)>9 else 1
cols=[]
for n in range(n0,n1+1,step):
    s=cv2.imread(f'src/f{n}.png')[y0:y1,x0:x1]; r=cv2.imread(f'all/r-{n/25:.3f}.png')[y0:y1,x0:x1]
    c=np.vstack([r,np.full((4,x1-x0,3),255,np.uint8),s])
    c=cv2.resize(c,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
    lab=np.zeros((22,c.shape[1],3),np.uint8); cv2.putText(lab,f'{n/25:.2f}',(3,16),cv2.FONT_HERSHEY_SIMPLEX,0.5,(255,255,255),1)
    cols.append(np.vstack([lab,c])); cols.append(np.full((cols[-1].shape[0],3,3),128,np.uint8))
im=np.hstack(cols); cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,90]); print(im.shape)
