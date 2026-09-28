import cv2, glob, sys, re, numpy as np
d,out,t0,t1,x0,y0,x1,y1,sc,per = sys.argv[1],sys.argv[2],float(sys.argv[3]),float(sys.argv[4]),*map(int,sys.argv[5:9]),float(sys.argv[9]),int(sys.argv[10])
fs = sorted(glob.glob(d+'/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1)))
fs = [f for f in fs if t0-1e-6 <= float(re.search(r'at-([\d.]+)s', f).group(1)) <= t1+1e-6]
tiles=[]
for f in fs:
    t = re.search(r'at-([\d.]+)s', f).group(1)
    A = cv2.imread(f)[y0:y1,x0:x1]; B = cv2.imread(f.replace('frame-','ref-'))[y0:y1,x0:x1]
    im = np.vstack([A, np.full((4,A.shape[1],3),(0,0,255),np.uint8), B])
    im = cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA)
    cv2.putText(im, t, (5,22), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,255), 2)
    tiles.append(np.vstack([im, np.full((8,im.shape[1],3),(255,0,0),np.uint8)]))
for i in range(0,len(tiles),per):
    cv2.imwrite(f'{out}-{i//per}.jpg', np.vstack(tiles[i:i+per]), [cv2.IMWRITE_JPEG_QUALITY, 90])
print(len(tiles))
