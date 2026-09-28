import cv2, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
for f in range(1578, 1587):
    c.set(cv2.CAP_PROP_POS_FRAMES,f); ok,im=c.read()
    b,g,r=[im[:,:,i].astype(int) for i in range(3)]
    m=((r-b)>60)&(g>120)&(r>150)
    ys,xs=np.nonzero(m[100:500,1000:1700]); xs=xs+1000; ys=ys+100
    # top edge of card: brightest paper band; find for columns the first row with gray>170 above y 400
    gray=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
    tops=[]
    for x in range(int(xs.mean())-80,int(xs.mean())+100,20):
        col=gray[150:420,x]; idx=np.nonzero(col>170)[0]
        tops.append((x,150+idx[0] if len(idx) else -1))
    print(f"t={f/25:.2f} smiley=({xs.mean():.1f},{ys.mean():.1f}) n={m.sum()} tops={tops}")
