import cv2, numpy as np, sys
for f in sys.argv[1:]:
    im=cv2.imread(f,0).astype(float)
    m=(cv2.GaussianBlur(im,(0,0),2)>100).astype(np.uint8)
    n,lab,st,_=cv2.connectedComponentsWithStats(m); k=1+np.argmax(st[1:,4]); m=(lab==k).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((15,15),np.uint8))
    dist=cv2.distanceTransform(1-m,cv2.DIST_L2,5)
    # only left/bottom side of the owl (x<1200) to avoid headphones
    sel=np.zeros_like(m,bool); sel[:, :1150]=True
    bands=[(2,6),(6,12),(12,20),(20,35),(35,60),(60,100),(100,200)]
    print(f.split('/')[-1][:22], ' '.join(f'{lo}-{hi}:{im[(dist>lo)&(dist<=hi)&sel].mean():5.1f}' for lo,hi in bands))
