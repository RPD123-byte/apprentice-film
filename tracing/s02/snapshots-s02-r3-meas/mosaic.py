# study only: paste source frames at their camera offsets to see the whole world (world = 6.04 frame coords)
import cv2, numpy as np, json
S='../s02-r3-src'; cam=json.load(open('oldcam.json'))
X0,Y0=-50,-1950; Wd,Hd=4500,2950
acc=np.zeros((Hd,Wd),np.float32); wt=np.zeros((Hd,Wd),np.float32)
frames=list(range(262,365,1))+list(range(413,478))
for f in frames:
    c=cam[str(f)]; im=cv2.imread(f'{S}/{f:04d}.png',0).astype(np.float32)
    # world = frame - cam
    x=int(round(-c[0]-X0)); y=int(round(-c[1]-Y0))
    acc[y:y+946,x:x+2206]+=im; wt[y:y+946,x:x+2206]+=1
im=cv2.imread(f'{S}/0262.png',0).astype(np.float32); acc[-Y0:-Y0+946,-X0:-X0+2206]=im*4; wt[-Y0:-Y0+946,-X0:-X0+2206]=4
m=(acc/np.maximum(wt,1)).astype(np.uint8)
for gx in range(0,Wd,250): cv2.line(m,(gx,0),(gx,Hd),90,1); cv2.putText(m,str(gx+X0),(gx+2,20),0,0.6,200,1)
for gy in range(0,Hd,250): cv2.line(m,(0,gy),(Wd,gy),90,1); cv2.putText(m,str(gy+Y0),(2,gy-3),0,0.6,200,1)
cv2.imwrite('world_mosaic.jpg',m,[cv2.IMWRITE_JPEG_QUALITY,85])
cv2.imwrite('world_mosaic_small.jpg',cv2.resize(m,(2250,1475)),[cv2.IMWRITE_JPEG_QUALITY,85])
