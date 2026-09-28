import cv2, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
c.set(1,int(round(39.96*25)))
for i in range(20):
    ok,f=c.read(); tt=39.96+i*0.04
    g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
    for th in [225]:
        m=(g>th).astype(np.uint8)
        m[:450,:]=0; m[:,:700]=0; m[:,1450:]=0
        m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
        n,lab,st,cen=cv2.connectedComponentsWithStats(m)
        k=1+np.argmax(st[1:,4]); x,y,w,h,a=st[k]
        print(f'{tt:.2f} th={th} bbox x {x}-{x+w} y {y}-{y+h} cen=({cen[k][0]:.0f},{cen[k][1]:.0f}) area={a}')
