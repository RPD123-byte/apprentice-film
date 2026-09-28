# crop.py outdir/name.jpg x0 y0 x1 y1 zoom renderPNG srcPNG [renderPNG srcPNG ...]  -> rows of (render | source) with a 10px grid
import cv2, sys, numpy as np
out=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); z=float(sys.argv[6]); fs=sys.argv[7:]
rows=[]
def prep(p,lab):
    im=cv2.imread(p)[y0:y1,x0:x1]
    im=cv2.resize(im,None,fx=z,fy=z,interpolation=cv2.INTER_NEAREST if z>=3 else cv2.INTER_CUBIC)
    for gx in range((x0//10+1)*10,x1,10):
        c=(0,0,160) if gx%50 else (0,0,255)
        if gx%50==0: cv2.line(im,(int((gx-x0)*z),0),(int((gx-x0)*z),im.shape[0]),c,1)
    for gy in range((y0//10+1)*10,y1,10):
        if gy%50==0: cv2.line(im,(0,int((gy-y0)*z)),(im.shape[1],int((gy-y0)*z)),(0,0,255),1)
    for gx in range((x0//50+1)*50,x1,50): cv2.putText(im,str(gx),(int((gx-x0)*z)+2,12),0,0.4,(0,255,255),1)
    for gy in range((y0//50+1)*50,y1,50): cv2.putText(im,str(gy),(2,int((gy-y0)*z)-2),0,0.4,(0,255,255),1)
    cv2.putText(im,lab,(4,im.shape[0]-6),0,0.5,(0,255,0),1)
    return im
for i in range(0,len(fs),2):
    a=prep(fs[i],'R '+fs[i].split('/')[-1][:24]); b=prep(fs[i+1],'S '+fs[i+1].split('/')[-1][:24])
    rows.append(np.hstack([a,np.full((a.shape[0],4,3),255,np.uint8),b]))
cv2.imwrite(out,np.vstack([np.vstack([r,np.full((4,r.shape[1],3),255,np.uint8)]) for r in rows]),[cv2.IMWRITE_JPEG_QUALITY,90])
