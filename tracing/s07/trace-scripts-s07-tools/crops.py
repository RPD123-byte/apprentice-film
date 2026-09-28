# side-by-side (render | ref) crops of named regions for close inspection. usage: crops.py DIR idx [names...]
import cv2, numpy as np, sys, glob
d=sys.argv[1]; idx=sys.argv[2]; names=sys.argv[3:]
R={'A':(0,0,760,560),'B':(600,0,1300,520),'C':(1150,0,2206,560),'D':(0,450,800,946),'E':(560,420,1300,946),'F':(1200,400,2206,946),
   'owl':(1380,180,1800,720),'face':(1230,150,1680,570),'hands':(560,520,1240,900),'lap':(280,420,1000,946),'beanie':(1240,0,1940,320)}
fr=glob.glob(f'{d}/frame-{idx}-at-*.png')[0]; rf=fr.replace('/frame-','/ref-')
a=cv2.imread(fr); b=cv2.imread(rf)
for n in names or R.keys():
    x0,y0,x1,y1=R[n]
    ca,cb=a[y0:y1,x0:x1],b[y0:y1,x0:x1]
    s=min(1.0, 1000/(2*(x1-x0)))*2 if (x1-x0)<500 else 1000/(x1-x0)
    im=np.hstack([ca,np.zeros((y1-y0,6,3),np.uint8)+80,cb]) if (x1-x0)<=560 else np.vstack([ca,np.zeros((6,x1-x0,3),np.uint8)+80,cb])
    sc=min(1.6, 1100/im.shape[1], 1100/im.shape[0])
    im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
    cv2.imwrite(f'{d}/crop-{idx}-{n}.jpg',im,[cv2.IMWRITE_JPEG_QUALITY,88])
    print(f'{d}/crop-{idx}-{n}.jpg', im.shape)
