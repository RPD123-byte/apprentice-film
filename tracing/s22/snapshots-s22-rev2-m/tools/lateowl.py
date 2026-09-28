import cv2, glob, sys, re, numpy as np
d,out = sys.argv[1], sys.argv[2]
B = {'79.8':(0,0,330),'80':(150,0,450),'80.2':(150,0,450),'80.4':(150,0,450),'80.6':(100,0,460),'80.8':(0,0,450),'81':(150,0,450),'81.2':(120,0,420),'81.4':(120,30,420),
 '81.6':(250,0,560),'81.8':(350,0,650),'82':(470,0,770),'82.2':(650,0,950),'82.4':(750,0,1050),'82.6':(900,0,1200),'82.8':(1000,0,1300),'83':(1080,0,1380),
 '83.2':(1190,0,1490),'83.4':(1260,0,1560),'83.6':(1330,0,1630),'83.8':(1380,0,1680),'84':(1470,0,1770)}
tiles=[]
for t,(x0,y0,x1) in B.items():
    f = glob.glob(f'{d}/frame-*-at-{t}s.png')[0]
    y1 = y0+280
    A = cv2.imread(f)[y0:y1,x0:x1]; R = cv2.imread(f.replace('frame-','ref-'))[y0:y1,x0:x1]
    im = np.hstack([A, np.full((A.shape[0],4,3),(0,0,255),np.uint8), R])
    im = cv2.resize(im, (int(im.shape[1]*1.4), int(im.shape[0]*1.4)))
    cv2.putText(im, t, (5,22), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,255), 2)
    tiles.append(im)
Wd = max(t.shape[1] for t in tiles)
tiles = [np.hstack([t, np.zeros((t.shape[0], Wd-t.shape[1],3),np.uint8)]) for t in tiles]
per=4
for i in range(0,len(tiles),per):
    cv2.imwrite(f'{out}-{i//per}.jpg', np.vstack(tiles[i:i+per]), [cv2.IMWRITE_JPEG_QUALITY, 90])
