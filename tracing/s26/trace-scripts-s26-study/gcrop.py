# gcrop.py out.jpg img1:cx:cy:R [img2:cx:cy:R ...]  -> 500px tiles with a 20px frame-coordinate grid
import cv2, numpy as np, sys
def tile(path, cx, cy, R):
    f=cv2.imread(path); f=cv2.copyMakeBorder(f,600,600,600,600,cv2.BORDER_CONSTANT)
    x0,y0=int(cx-R),int(cy-R)
    im=f[y0+600:y0+600+2*R,x0+600:x0+600+2*R].copy()
    k=500/(2*R); im=cv2.resize(im,(500,500),interpolation=cv2.INTER_CUBIC)
    step=20 if R<=200 else 50
    for X in range((x0//step+1)*step,x0+2*R,step):
        px=int((X-x0)*k); cv2.line(im,(px,0),(px,499),(0,0,255) if X%100==0 else (0,160,255),1)
        if X%100==0: cv2.putText(im,str(X),(px+2,12),0,0.4,(0,255,255),1)
    for Y in range((y0//step+1)*step,y0+2*R,step):
        py=int((Y-y0)*k); cv2.line(im,(0,py),(499,py),(0,0,255) if Y%100==0 else (0,160,255),1)
        if Y%100==0: cv2.putText(im,str(Y),(2,py-2),0,0.4,(0,255,255),1)
    cv2.putText(im,path.split('/')[-1][:24],(5,490),0,0.4,(255,255,0),1)
    return im
out=sys.argv[1]; ims=[]
for a in sys.argv[2:]:
    p,cx,cy,R=a.split(':'); ims.append(tile(p,float(cx),float(cy),int(R)))
while len(ims)%3: ims.append(np.zeros_like(ims[0]))
cv2.imwrite(out,np.vstack([np.hstack(ims[i:i+3]) for i in range(0,len(ims),3)]))
