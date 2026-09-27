# gridc.py out.jpg x0 y0 x1 y1 k F [F ...] : zoomed source crops with a 10/50 px grid (labels at 50), tiled 2 per row
import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(V)
out=sys.argv[1]; x0,y0,x1,y1,k=map(int,sys.argv[2:7]); Fs=[int(v) for v in sys.argv[7:]]
tiles=[]
for F in Fs:
    cap.set(1,F); ok,f=cap.read()
    r=cv2.resize(f[y0:y1,x0:x1],None,fx=k,fy=k,interpolation=cv2.INTER_CUBIC)
    for x in range((x0//10+1)*10,x1,10):
        c=(0,160,255) if x%50 else (0,0,255); cv2.line(r,((x-x0)*k,0),((x-x0)*k,r.shape[0]),c,1)
        if x%50==0: cv2.putText(r,str(x),((x-x0)*k+2,12),0,0.4,(0,0,255),1)
    for y in range((y0//10+1)*10,y1,10):
        c=(0,160,255) if y%50 else (0,0,255); cv2.line(r,(0,(y-y0)*k),(r.shape[1],(y-y0)*k),c,1)
        if y%50==0: cv2.putText(r,str(y),(2,(y-y0)*k-2),0,0.4,(0,0,255),1)
    cv2.putText(r,f'F{F} {F/25:.2f}',(4,r.shape[0]-6),0,0.6,(0,255,255),2)
    tiles.append(r)
while len(tiles)%2: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,np.vstack([np.hstack(tiles[i:i+2]) for i in range(0,len(tiles),2)]),[cv2.IMWRITE_JPEG_QUALITY,90])
