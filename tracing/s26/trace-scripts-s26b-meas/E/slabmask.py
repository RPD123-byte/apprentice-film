import cv2, numpy as np, json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(V)
tiles=[]; out={}
for F in range(2842,2854):
    cap.set(1,F); ok,f=cap.read()
    hsv=cv2.cvtColor(cv2.GaussianBlur(f,(0,0),3),cv2.COLOR_BGR2HSV)
    g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
    hf=np.abs(g-cv2.GaussianBlur(g,(0,0),2.0)); hf=cv2.GaussianBlur(hf,(0,0),6)
    m=((hsv[...,1]<60)&(hf<6.5)&(hsv[...,2]>12)).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((15,15),np.uint8)); m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((31,31),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(m)
    if n>1:
        i=1+np.argmax(st[1:,4]); k=(lab==i).astype(np.uint8)
    else: k=m
    np.save(f'slab{F}.npy',k.astype(bool))
    v=(f*0.6).astype(np.uint8); cs,_=cv2.findContours(k,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); cv2.drawContours(v,cs,-1,(0,255,0),4)
    cv2.putText(v,str(F),(20,60),0,2,(0,255,255),3); tiles.append(cv2.resize(v,(551,236)))
    print(F,int(k.sum()))
cv2.imwrite('slabmasks.jpg',np.vstack([np.hstack(tiles[i:i+4]) for i in range(0,12,4)]))
