import cv2, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
c.set(1,int(round(63.12*25)))
for f in range(int(round(63.12*25)), int(round(69.44*25))):
    ok,im=c.read()
    hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV)
    m=(hsv[...,0]>18)&(hsv[...,0]<40)&(hsv[...,1]>90)&(hsv[...,2]>120)
    ys,xs=np.nonzero(m)
    if len(xs)>30:
        print(f"{f/25:.2f} n={len(xs)} c=({xs.mean():.1f},{ys.mean():.1f}) bb=({xs.min()},{ys.min()},{xs.max()},{ys.max()})")
    else: print(f"{f/25:.2f} none")
