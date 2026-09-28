# Semi-automatic base outline: segment the silver base (low saturation, bright, near the predicted quad) and fit a
# quadrilateral to its outline; writes an overlay for checking. usage: basecorners.py t [t ...]
import cv2, numpy as np, json, sys
from src import frame
S={round(r[0],2):np.array(r[1:]).reshape(3,3) for r in json.load(open('../s27d-meas/screen.json'))}
for r in json.load(open('../s27d-meas/screen2.json')):
    if r[0]>=122.0: S[round(r[0],2)]=np.array(r[1:]).reshape(3,3)
KB={round(r[0],2):np.array(r[1:]).reshape(3,3) for r in json.load(open('../s27d-meas/klt_base.json'))['H']}
C=np.float32([[680,673],[1489,673],[1620,774],[546,774]])
out=[]
tiles=[]
for a in sys.argv[1:]:
    t=float(a); f=frame(t)
    hsv=cv2.cvtColor(f,cv2.COLOR_BGR2HSV)
    H=KB[min(KB,key=lambda k:abs(k-t))]
    guess=cv2.perspectiveTransform(C[None],H)[0]
    m=np.zeros(f.shape[:2],np.uint8); cv2.fillPoly(m,[np.int32(guess)],255); m=cv2.dilate(m,np.ones((81,81),np.uint8))
    # silver / dark keys: low saturation
    sil=((hsv[...,1]<60)&(hsv[...,2]>40)).astype(np.uint8)*255 & m
    sil=cv2.morphologyEx(sil,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(sil)
    if n<2: continue
    k=1+np.argmax(st[1:,4]); comp=(lab==k).astype(np.uint8)*255
    cs,_=cv2.findContours(comp,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    c=max(cs,key=cv2.contourArea)
    hull=cv2.convexHull(c)
    ov=f.copy(); cv2.drawContours(ov,[hull],-1,(0,255,0),2)
    x,y,w,h=cv2.boundingRect(hull); x0,y0=max(0,x-40),max(0,y-40)
    crop=ov[y0:y+h+40,x0:x+w+40]
    tiles.append((t,crop,x0,y0,hull.reshape(-1,2)))
    print(t,'hull',hull.reshape(-1,2).tolist()[:40])
for t,crop,x0,y0,h in tiles:
    z=min(3,1400/crop.shape[1]); big=cv2.resize(crop,None,fx=z,fy=z)
    for gx in range((x0//20+1)*20,x0+crop.shape[1],20):
        X=int((gx-x0)*z); cv2.line(big,(X,0),(X,big.shape[0]),(0,0,255) if gx%100==0 else (0,180,255),1)
        if gx%100==0: cv2.putText(big,str(gx),(X+2,12),0,0.4,(255,255,0),1)
    for gy in range((y0//20+1)*20,y0+crop.shape[0],20):
        Y=int((gy-y0)*z); cv2.line(big,(0,Y),(big.shape[1],Y),(0,0,255) if gy%100==0 else (0,180,255),1)
        if gy%100==0: cv2.putText(big,str(gy),(2,Y-2),0,0.4,(255,255,0),1)
    cv2.imwrite(f'../s27d-study/bc_{t:.2f}.jpg',big,[cv2.IMWRITE_JPEG_QUALITY,88])
