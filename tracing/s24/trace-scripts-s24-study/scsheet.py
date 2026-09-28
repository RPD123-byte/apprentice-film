import cv2,numpy as np,sys
x0,y0,x1,y1=[int(v) for v in sys.argv[1:5]]; ks=range(int(sys.argv[5]),int(sys.argv[6])+1); out=sys.argv[7]; cols=int(sys.argv[8]) if len(sys.argv)>8 else 5
tiles=[]
for k in ks:
    f=cv2.imread('snapshots/s24-study/fr/f%03d.png'%k)[y0:y1,x0:x1].copy()
    f=(f*0.8).astype(np.uint8)
    for x in range((x0//50+1)*50,x1,50):
        cv2.line(f,(x-x0,0),(x-x0,y1-y0),(0,0,255) if x%100==0 else (0,90,140),1)
        if x%100==0: cv2.putText(f,str(x),(x-x0+2,24),0,0.4,(0,255,255),1)
    for y in range((y0//50+1)*50,y1,50):
        cv2.line(f,(0,y-y0),(x1-x0,y-y0),(0,0,255) if y%100==0 else (0,90,140),1)
        if y%100==0: cv2.putText(f,str(y),(2,y-y0-2),0,0.4,(0,255,255),1)
    cv2.putText(f,'k%d'%k,(x1-x0-60,20),0,0.6,(0,255,0),2)
    tiles.append(f)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows))
