import numpy as np, cv2, sys
# dz.py rd k x0 y0 x1 y1 out zoom  -> [render | source | signed diff]
rd,k=sys.argv[1],int(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]; z=float(sys.argv[8]) if len(sys.argv)>8 else 2
a=cv2.imread(f'{rd}/r{k}.png').astype(np.float32); b=cv2.imread(f'snapshots/s08-f3-src/f{k}.png').astype(np.float32)
A=a[y0:y1,x0:x1]; B=b[y0:y1,x0:x1]
dl=(cv2.GaussianBlur(A,(0,0),1.5)-cv2.GaussianBlur(B,(0,0),1.5)).mean(-1)
v=np.clip(dl*4,-255,255)
vis=np.zeros_like(A); vis[...,2]=np.clip(v,0,255); vis[...,0]=np.clip(-v,0,255)
vis=vis*0.8+cv2.cvtColor(B.mean(-1).astype(np.uint8),cv2.COLOR_GRAY2BGR)*0.3
def grid(im):
    im=cv2.resize(im,None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC if z>1 else cv2.INTER_AREA)
    st=20 if (x1-x0)<400 else 50
    for x in range((x0//st+1)*st,x1,st): X=int((x-x0)*z); cv2.line(im,(X,0),(X,im.shape[0]),(60,60,60),1); cv2.putText(im,str(x),(X+2,12),0,0.4,(0,220,220),1)
    for y in range((y0//st+1)*st,y1,st): Y=int((y-y0)*z); cv2.line(im,(0,Y),(im.shape[1],Y),(60,60,60),1); cv2.putText(im,str(y),(2,Y-2),0,0.4,(0,220,220),1)
    return im
sep=np.full((int((y1-y0)*z),4,3),(0,0,255),np.float32)
cv2.imwrite(out,np.clip(np.hstack([grid(A),sep,grid(B),sep,grid(vis)]),0,255).astype(np.uint8),[cv2.IMWRITE_JPEG_QUALITY,90])
