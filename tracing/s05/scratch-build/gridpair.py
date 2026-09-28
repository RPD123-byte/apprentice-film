import cv2, numpy as np, sys, glob
d,tag=sys.argv[1],sys.argv[2]; x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; s=float(sys.argv[7]); out=sys.argv[8]
step=int(sys.argv[9]) if len(sys.argv)>9 else 50
a=cv2.imread(glob.glob(f'{d}/frame-*-at-{tag}s.png')[0])[y0:y1,x0:x1]; b=cv2.imread(glob.glob(f'{d}/ref-*-at-{tag}s.png')[0])[y0:y1,x0:x1]
a=cv2.resize(a,None,fx=s,fy=s,interpolation=cv2.INTER_AREA if s<1 else cv2.INTER_CUBIC); b=cv2.resize(b,None,fx=s,fy=s,interpolation=cv2.INTER_AREA if s<1 else cv2.INTER_CUBIC)
for im in (a,b):
    for gx in range((x0//step+1)*step,x1,step):
        X=int((gx-x0)*s); cv2.line(im,(X,0),(X,10),(0,255,255),2); cv2.putText(im,str(gx),(X+2,22),0,0.45,(0,255,255),1)
    for gy in range((y0//step+1)*step,y1,step):
        Y=int((gy-y0)*s); cv2.line(im,(0,Y),(10,Y),(0,255,255),2); cv2.putText(im,str(gy),(12,Y+5),0,0.45,(0,255,255),1)
sep=np.zeros((a.shape[0],6,3),np.uint8); sep[:]=(0,200,255)
cv2.imwrite(out,np.hstack([a,sep,b]),[cv2.IMWRITE_JPEG_QUALITY,90]); print(out)
