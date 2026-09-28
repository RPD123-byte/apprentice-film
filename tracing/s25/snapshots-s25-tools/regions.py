# regions.py FRAME T out.jpg [x0 y0 x1 y1] -- bright regions bounded by ink (gray < T), labelled, with a frame-px grid
import cv2,numpy as np,sys
def label(f,T=140,box=(560,250,1560,946),minA=150,dil=3):
    g=cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s25-src/f{f:05d}.png',0)
    x0,y0,x1,y1=box
    s=cv2.GaussianBlur(g[y0:y1,x0:x1],(0,0),0.8)
    ink=(s<T).astype(np.uint8)
    if dil>1: ink=cv2.dilate(ink,np.ones((dil,dil),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(1-ink,connectivity=4)
    return lab,st,cen,ink
if __name__=='__main__':
    f=int(sys.argv[1]); T=int(sys.argv[2]); out=sys.argv[3]
    box=tuple(int(v) for v in sys.argv[4:8]) if len(sys.argv)>7 else (560,250,1560,946)
    lab,st,cen,ink=label(f,T,box)
    x0,y0,x1,y1=box
    rng=np.random.RandomState(3); col=rng.randint(60,255,(len(st),3)).astype(np.uint8); col[0]=0
    big=st[:,4]>150
    img=np.where(big[lab][...,None],col[lab],0).astype(np.uint8)
    sc=1.3
    img=cv2.resize(img,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST)
    for x in range((x0//50+1)*50,x1,50):
        X=int((x-x0)*sc); cv2.line(img,(X,0),(X,img.shape[0]),(90,90,90),1); cv2.putText(img,str(x),(X+2,12),0,0.4,(255,255,255),1)
    for y in range((y0//50+1)*50,y1,50):
        Y=int((y-y0)*sc); cv2.line(img,(0,Y),(img.shape[1],Y),(90,90,90),1); cv2.putText(img,str(y),(2,Y-3),0,0.4,(255,255,255),1)
    cv2.imwrite(out,img)
