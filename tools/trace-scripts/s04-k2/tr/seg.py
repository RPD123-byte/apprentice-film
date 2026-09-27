import cv2, numpy as np, sys
sys.path.insert(0,'tr'); from grade import degrade
out=[]
for t in sys.argv[1:]:
    F=cv2.imread(f'ref/{t}.png',0).astype(np.float32); P=degrade(F,float(t))
    b=cv2.GaussianBlur(P,(0,0),3)
    lit=(b>95).astype(np.uint8)
    # close the hair gaps between lit parts
    k=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(61,61))
    cl=cv2.morphologyEx(lit,cv2.MORPH_CLOSE,k)
    n,lab,st,_=cv2.connectedComponentsWithStats(cl)
    keep=np.zeros_like(cl)
    for i in range(1,n):
        if st[i,4]>60000: keep[lab==i]=1
    im=cv2.cvtColor(F.astype(np.uint8),cv2.COLOR_GRAY2BGR)
    cs,_=cv2.findContours(keep,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE); cv2.drawContours(im,cs,-1,(0,0,255),2)
    cs,_=cv2.findContours(lit,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE); cv2.drawContours(im,cs,-1,(0,255,0),1)
    out.append(cv2.resize(im,(1103,473)))
cv2.imwrite('seg.jpg',np.vstack([np.hstack(out[i:i+2]) if i+1<len(out) else np.hstack([out[i],np.zeros_like(out[i])]) for i in range(0,len(out),2)]))
