import cv2,numpy as np,sys
from segm import L
def brightmask(f,bright=150,grow=45):
    g=cv2.GaussianBlur(cv2.cvtColor(L(f),cv2.COLOR_BGR2GRAY),(0,0),3)
    br=(g>bright).astype(np.uint8)
    n,lab,st,_=cv2.connectedComponentsWithStats(br)
    keep=np.zeros_like(br)
    for i in range(1,n):
        x,y,w,h,a=st[i]
        if a>15000 and x<1300 and x+w>850 and y+h>500: keep[lab==i]=1
    k=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*grow+1,2*grow+1))
    return keep, cv2.dilate(keep,k)
def segment(fx,bgs,thr=30,blur=2.0):
    X=cv2.GaussianBlur(L(fx),(0,0),blur)
    D=np.full(X.shape[:2],1e9,np.float32)
    for b in bgs:
        _,occ=brightmask(b,grow=int(sys.argv[3]) if len(sys.argv)>3 else 45)
        B=cv2.GaussianBlur(L(b),(0,0),blur)
        d=np.abs(X-B).max(2); d[occ>0]=1e9
        D=np.minimum(D,d)
    return D
if __name__=='__main__':
    fx=int(sys.argv[1]); bgs=list(map(int,sys.argv[2].split(',')))
    D=segment(fx,bgs)
    keep,_=brightmask(fx,grow=1)
    unk=(D>=1e8)
    dm=((D>30)&~unk).astype(np.uint8)
    x0,y0,x1,y1=600,180,1600,946
    vis=np.dstack([unk*255,keep*255,dm*255]).astype(np.uint8)[y0:y1,x0:x1]
    cv2.imwrite(f'seg{fx}.jpg',cv2.resize(vis,None,fx=0.8,fy=0.8))
    np.save(f'D{fx}.npy',D)
